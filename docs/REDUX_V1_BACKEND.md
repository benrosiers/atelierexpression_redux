# Redux V1 - Reservation backend

## Current state

The database schema and reservation function are prepared.

They are not automatically deployed by the PowerShell script.

No public booking form should be enabled yet.

## Install the database

1. Create or select the correct Supabase project.
2. Open its SQL Editor.
3. Review and execute:
   supabase/migrations/20260922160000_redux_v1_core.sql
4. Execute:
   supabase/tests/redux_v1_security.sql
5. Verify the RLS policies in the Supabase dashboard.

Only apply this migration once to an empty Redux schema.

## First administrator

Create an administrator in Supabase Auth first.

Using the SQL Editor with administrator privileges, insert
that user's verified UUID into public.redux_admins.

Never grant administration based only on an email address.

## Reservations

The public site does not call redux_reserve directly.

A trusted backend must validate the request, rate-limit it
and invoke the RPC with a server-side Supabase secret key.

The reservation function locks the activity row before
counting active reservations, preventing concurrent
requests through this function from exceeding capacity.

Public forms must also receive spam protection.

## Emails

email_state starts as pending.

A separate server-side mail process must send confirmation
messages and update the delivery state.

Do not claim that an email was delivered merely because a
database reservation was created.

## Payment

payment_state starts as unpaid.

Payment is collected on site.

## Remaining work

- Trusted booking API and abuse protection
- Public registration form
- Email delivery and retries
- Administrator interface
- Real database integration tests
- Production configuration and deployment

Never put a service-role or secret key in PUBLIC_*,
client JavaScript, public/, or GitHub.