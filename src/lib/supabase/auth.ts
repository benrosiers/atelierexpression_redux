// Thin auth helpers for /admin. All client-side — see docs/CMS_MIGRATION_PLAN.md
// addendum for why /admin has no server/SSR component: the HTML shell is as
// public as any static file, and Postgres RLS (not page-level auth) is what
// actually protects the data. These helpers exist to (a) drive the login UX
// and (b) look up the caller's role for UI purposes (showing/hiding buttons
// an editor shouldn't see) — never as the security boundary itself.

import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient } from './client';

export type Role = 'admin' | 'editor';

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  role: Role;
}

export async function getSession(): Promise<Session | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session;
}

// Reads the caller's own row — RLS's "self read own profile" policy is what
// makes this safe; there is no client-side role check happening here, only
// a query that RLS will simply return empty for if unauthenticated.
export async function getCurrentProfile(): Promise<Profile | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const session = await getSession();
  if (!session) return null;

  // .maybeSingle() (not .single()) — a user with no profiles row is an
  // expected, normal case here (see requireAdminSession()'s no-profile
  // path), not an error. .single() treats zero rows as a failure and logs
  // a 406 to the console for it; .maybeSingle() returns null cleanly.
  const { data, error } = await client
    .from('profiles')
    .select('id, email, display_name, role')
    .eq('id', session.user.id)
    .maybeSingle();

  if (error || !data) return null;
  return data as Profile;
}

export async function signInWithMagicLink(email: string): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'not-configured' };

  const { error } = await client.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/admin` },
  });

  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function signInWithPassword(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'not-configured' };

  const { error } = await client.auth.signInWithPassword({ email, password });
  return error ? { ok: false, error: error.message } : { ok: true };
}

// Sets (or replaces) the password for the currently-authenticated user.
// Requires an active session — this is a self-service change made from
// inside /admin, never a password-reset-by-email flow (magic link already
// covers "I forgot how to get in"). Supabase enforces its own minimum
// length server-side; we only check confirmation match client-side.
export async function updatePassword(newPassword: string): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'not-configured' };

  const { error } = await client.auth.updateUser({ password: newPassword });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function signOut(): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  await client.auth.signOut();
}

export type GuardResult =
  | { ok: true; profile: Profile }
  | { ok: false; reason: 'no-session' | 'no-profile' };

// Single source of truth for "is this visitor allowed into /admin". A valid
// Supabase session is necessary but not sufficient — an authenticated user
// with no `profiles` row (never provisioned via create-admin-user.mjs, or
// removed later) must be refused, not silently let through with a blank
// identity. On refusal-by-missing-profile, the session is signed out here
// so the caller can redirect once and land cleanly on the login page
// (no repeated bounce: the next check anywhere finds no session at all).
export async function requireAdminSession(): Promise<GuardResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: 'no-session' };

  const profile = await getCurrentProfile();
  if (!profile) {
    await signOut();
    return { ok: false, reason: 'no-profile' };
  }

  return { ok: true, profile };
}
