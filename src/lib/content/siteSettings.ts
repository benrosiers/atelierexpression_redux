// Typed access layer for the `site_settings` table — truly global,
// non-repeatable, non-page-specific config only (see
// docs/CMS_MIGRATION_PLAN.md §Site Settings for the "don't dump everything
// in one JSON" rule this file enforces via a closed key map).
//
// This is the admin-side (authenticated staff, browser client) read/write
// layer. The public site reads the same table at build time through a
// separate build-time client in src/lib/content/publicContent.ts
// (getPublicSiteSetting) — the two are deliberately not shared, same
// reasoning as pages.ts vs publicContent.ts. Only `site_identity`, `social`
// (BaseLayout's Organization JSON-LD) and `form_messages` (the 4 form
// components) are actually read via that build-time path today; the rest
// of this map (`contact`, `seo_defaults`, `navigation_main`,
// `navigation_footer`, `cta_global`, `newsletter`) is seeded data with no
// consumer yet. None of these keys have a dedicated admin editor UI —
// only this typed read/write layer exists so far.

import { getSupabaseClient } from '../supabase/client';

export interface NavItem {
  label: string;
  href: string;
  accent?: boolean;
}

export interface SiteSettingsMap {
  site_identity: { name: string; domain: string; url: string; tagline: string; description: string };
  contact: { email: string; location: string };
  social: { instagram: string; facebook: string };
  seo_defaults: { ogImage: string; ogLocale: string };
  navigation_main: NavItem[];
  navigation_footer: NavItem[][];
  // Static fallback only — the real label depends on the featured workshop's
  // status (src/data/nextWorkshop.ts today, a `workshops` row in Phase 3).
  // Not a source of truth on its own; see docs/admin/content-inventory.md.
  cta_global: { label: string; href: string };
  newsletter: { enabled: boolean };
  // Only the pure-text, non-interpolated parts of each form's copy — error
  // and "not configured" messages embed a mailto link (JSX) and stay
  // hardcoded in each component, same reasoning as CSS variant class names
  // in "What's deliberately NOT going into the CMS" (content-inventory.md).
  form_messages: {
    interest: { submitLabel: string; loadingLabel: string; successMessage: string };
    reservation: { submitLabel: string; loadingLabel: string; successTitle: string; successBody: string };
    newsletter: { submitLabel: string; loadingLabel: string; successMessage: string };
    contact: { submitLabel: string; loadingLabel: string; successMessage: string };
  };
}

export type SiteSettingsKey = keyof SiteSettingsMap;

export async function getSiteSettings<K extends SiteSettingsKey>(
  key: K,
): Promise<SiteSettingsMap[K] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from('site_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error || !data) return null;
  return data.value as SiteSettingsMap[K];
}

export async function getAllSiteSettings(): Promise<Partial<SiteSettingsMap>> {
  const client = getSupabaseClient();
  if (!client) return {};

  const { data, error } = await client.from('site_settings').select('key, value');
  if (error || !data) return {};

  const out: Partial<SiteSettingsMap> = {};
  for (const row of data) {
    (out as Record<string, unknown>)[row.key] = row.value;
  }
  return out;
}

// Admin-only write path — relies entirely on RLS ("staff write/update site
// settings") to reject non-staff callers; this function performs no
// client-side role check of its own, by design (see auth.ts header note on
// RLS being the real boundary).
export async function updateSiteSettings<K extends SiteSettingsKey>(
  key: K,
  value: SiteSettingsMap[K],
): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'not-configured' };

  const { error } = await client
    .from('site_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

  return error ? { ok: false, error: error.message } : { ok: true };
}
