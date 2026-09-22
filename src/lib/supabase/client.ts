// Browser Supabase client for /admin. Follows the same honest-configuration
// philosophy as src/lib/formspree.ts: until PUBLIC_SUPABASE_URL and
// PUBLIC_SUPABASE_ANON_KEY are set, the admin UI shows a clear "not
// configured" state — it never pretends a connection exists.
//
// Security model (see docs/CMS_MIGRATION_PLAN.md addendum): the anon key
// below is safe to ship to the browser ONLY because Postgres Row Level
// Security is the real access boundary — this key alone grants nothing.
// NEVER import a service_role key here or anywhere else that ships to the
// browser; it belongs only to scripts/migrate-static-content-to-supabase.ts,
// run locally/in CI.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;
  return typeof url === 'string' && url.trim().length > 0
    && typeof key === 'string' && key.trim().length > 0;
}

let cached: SupabaseClient | null = null;

// Returns null (never throws) when unconfigured, so callers follow the same
// `if (!client) { showNotConfigured(); return; }` shape as isFormConfigured().
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (cached) return cached;

  cached = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL as string,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true, // required for the magic-link callback
      },
    },
  );
  return cached;
}
