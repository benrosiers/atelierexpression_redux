-- Atelier Expression Redux V1
-- Schema only. No real activity or participant is seeded.

create table public.redux_activities (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique,
    type text not null check (
        type in ('atelier', 'evenement', 'gym-social')
    ),
    title text not null,
    summary text not null,
    description text not null,
    starts_at timestamptz not null,
    ends_at timestamptz not null,
    timezone text not null default 'America/Toronto'
        check (timezone = 'America/Toronto'),
    location text not null,
    host text not null,
    price_cents integer not null check (price_cents >= 0),
    capacity integer not null check (capacity > 0),
    status text not null default 'announced'
        check (status in ('announced', 'open', 'full', 'cancelled')),
    published boolean not null default false,
    created_at timestamptz not null default now(),

    constraint redux_activity_dates
        check (ends_at > starts_at),

    constraint redux_activity_slug
        check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create table public.redux_admins (
    user_id uuid primary key references auth.users(id)
        on delete cascade,
    created_at timestamptz not null default now()
);

create table public.redux_reservations (
    id uuid primary key default gen_random_uuid(),

    activity_id uuid not null
        references public.redux_activities(id),

    name text not null,
    email text not null,
    phone text,

    status text not null default 'reserved'
        check (status in ('reserved', 'cancelled')),

    payment_state text not null default 'unpaid'
        check (payment_state in ('unpaid', 'paid')),

    email_state text not null default 'pending'
        check (email_state in ('pending', 'sent', 'failed')),

    consent_at timestamptz not null,
    created_at timestamptz not null default now(),

    constraint redux_reservation_name
        check (char_length(name) between 2 and 120),

    constraint redux_reservation_email
        check (char_length(email) between 5 and 254)
);

-- An email can hold at most one active place per activity.
create unique index redux_one_active_reservation
on public.redux_reservations (
    activity_id,
    lower(email)
)
where status = 'reserved';

create index redux_reservations_activity
on public.redux_reservations(activity_id);

create index redux_activities_calendar
on public.redux_activities(starts_at)
where published = true;

-- RLS is mandatory on every table.
alter table public.redux_activities enable row level security;
alter table public.redux_admins enable row level security;
alter table public.redux_reservations enable row level security;

-- Remove inherited default API privileges first.
revoke all on public.redux_activities
    from public, anon, authenticated;

revoke all on public.redux_admins
    from public, anon, authenticated;

revoke all on public.redux_reservations
    from public, anon, authenticated;

-- Visitors only read published activities.
grant select on public.redux_activities
    to anon, authenticated;

create policy redux_public_activities
on public.redux_activities
for select
to anon, authenticated
using (published = true);

-- An authenticated admin can see their own membership.
grant select on public.redux_admins to authenticated;

create policy redux_admin_self
on public.redux_admins
for select
to authenticated
using (user_id = (select auth.uid()));

-- Only approved admins can manage activity records.
grant insert, update, delete
on public.redux_activities
to authenticated;

create policy redux_admin_manage_activities
on public.redux_activities
for all
to authenticated
using (
    exists (
        select 1
        from public.redux_admins a
        where a.user_id = (select auth.uid())
    )
)
with check (
    exists (
        select 1
        from public.redux_admins a
        where a.user_id = (select auth.uid())
    )
);

-- Admins may read reservations, but may not alter them
-- directly through the browser API.
grant select on public.redux_reservations
to authenticated;

create policy redux_admin_read_reservations
on public.redux_reservations
for select
to authenticated
using (
    exists (
        select 1
        from public.redux_admins a
        where a.user_id = (select auth.uid())
    )
);

-- The trusted backend is allowed to perform operations.
grant all on public.redux_activities to service_role;
grant all on public.redux_admins to service_role;
grant all on public.redux_reservations to service_role;

-- Atomic reservation function.
-- Invoke from a trusted backend with its service key.
-- Never expose that key in the static Astro site.
create function public.redux_reserve(
    p_slug text,
    p_name text,
    p_email text,
    p_phone text,
    p_consent boolean
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
    v_activity_id uuid;
    v_capacity integer;
    v_used integer;
    v_email text;
    v_name text;
    v_reservation_id uuid;
begin
    v_name := pg_catalog.btrim(p_name);
    v_email := pg_catalog.lower(
        pg_catalog.btrim(p_email)
    );

    if p_consent is distinct from true then
        raise exception 'consent_required';
    end if;

    if v_name is null or
       pg_catalog.char_length(v_name) not between 2 and 120 then
        raise exception 'invalid_name';
    end if;

    if v_email is null or
       pg_catalog.char_length(v_email) not between 5 and 254 or
       v_email !~ '^[^@ ]+@[^@ ]+[.][^@ ]+$' then
        raise exception 'invalid_email';
    end if;

    if p_phone is not null and
       pg_catalog.char_length(p_phone) > 40 then
        raise exception 'invalid_phone';
    end if;

    -- Lock the activity before counting available places.
    -- Concurrent calls for the same activity serialize here.
    select a.id, a.capacity
    into v_activity_id, v_capacity
    from public.redux_activities a
    where a.slug = p_slug
      and a.published = true
      and a.status = 'open'
      and a.starts_at > pg_catalog.now()
    for update;

    if not found then
        raise exception 'activity_not_available';
    end if;

    select pg_catalog.count(*)
    into v_used
    from public.redux_reservations r
    where r.activity_id = v_activity_id
      and r.status = 'reserved';

    if v_used >= v_capacity then
        raise exception 'sold_out';
    end if;

    insert into public.redux_reservations (
        activity_id,
        name,
        email,
        phone,
        consent_at
    )
    values (
        v_activity_id,
        v_name,
        v_email,
        nullif(
            pg_catalog.btrim(p_phone),
            ''
        ),
        pg_catalog.now()
    )
    returning id into v_reservation_id;

    return v_reservation_id;
end;
$function$;

-- Functions receive EXECUTE privileges by default.
-- Restrict this function explicitly.
revoke all on function public.redux_reserve(
    text, text, text, text, boolean
) from public, anon, authenticated;

grant execute on function public.redux_reserve(
    text, text, text, text, boolean
) to service_role;