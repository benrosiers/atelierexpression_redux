-- Run AFTER applying the migration in Supabase SQL Editor.
-- These tests do not create or modify participant records.

do $tests$
begin
    if not (
        select relrowsecurity
        from pg_catalog.pg_class
        where oid = 'public.redux_activities'::regclass
    ) then
        raise exception 'Activity RLS is disabled';
    end if;

    if not (
        select relrowsecurity
        from pg_catalog.pg_class
        where oid = 'public.redux_reservations'::regclass
    ) then
        raise exception 'Reservation RLS is disabled';
    end if;

    if not (
        select relrowsecurity
        from pg_catalog.pg_class
        where oid = 'public.redux_admins'::regclass
    ) then
        raise exception 'Admin RLS is disabled';
    end if;

    if pg_catalog.has_table_privilege(
        'anon',
        'public.redux_reservations',
        'SELECT'
    ) then
        raise exception 'Anonymous reservation read is allowed';
    end if;

    if pg_catalog.has_table_privilege(
        'anon',
        'public.redux_reservations',
        'INSERT'
    ) then
        raise exception 'Anonymous reservation insert is allowed';
    end if;

    if pg_catalog.has_function_privilege(
        'anon',
        'public.redux_reserve(text,text,text,text,boolean)',
        'EXECUTE'
    ) then
        raise exception 'Anonymous reservation RPC is exposed';
    end if;

    raise notice 'Redux V1 security checks passed';
end;
$tests$;