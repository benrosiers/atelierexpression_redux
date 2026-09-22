// Reads secrets from admin_config (migration 0011) — values that must never
// ship as a PUBLIC_ env var because the admin shell HTML itself is
// unauthenticated-readable. RLS restricts select to the admin role, so this
// only ever resolves anything once requireAdminSession() has already passed.

import { getSupabaseClient } from './client';

export async function getAdminConfig(key: string): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from('admin_config')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error || !data) return null;
  return data.value as string;
}
