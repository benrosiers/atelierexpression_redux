// Typed access layer for /admin/workshops. Same shape/philosophy as
// pages.ts: staff-side (RLS lets an authenticated admin/editor see drafts),
// locale-parameterized, basic input validation on writes.

import { getSupabaseClient } from '../supabase/client';

export interface WorkshopRow {
  id: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  visible: boolean;
  featured: boolean;
  coming_soon: boolean;
  price_cents: number | null;
  currency: string;
  duration_minutes: number | null;
  capacity_min: number | null;
  capacity_max: number | null;
  location: string | null;
  icon_glyph: string | null;
  visual_variant: string | null;
  sort_order: number;
  updated_at: string;
  title: string | null;
  tagline: string | null;
  description: string | null;
  audience: string | null;
}

const DEFAULT_LOCALE_CODE = 'fr-CA';

async function localeIdFor(client: NonNullable<ReturnType<typeof getSupabaseClient>>, code: string) {
  const { data } = await client.from('locales').select('id').eq('code', code).maybeSingle();
  return data?.id ?? null;
}

export async function listWorkshops(localeCode: string = DEFAULT_LOCALE_CODE): Promise<WorkshopRow[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  const localeId = await localeIdFor(client, localeCode);

  const { data: workshops, error } = await client
    .from('workshops')
    .select('id, slug, status, visible, featured, coming_soon, price_cents, currency, duration_minutes, capacity_min, capacity_max, location, icon_glyph, visual_variant, sort_order, updated_at')
    .order('sort_order', { ascending: true });
  if (error || !workshops) return [];

  const results: WorkshopRow[] = [];
  for (const w of workshops) {
    const { data: t } = await client
      .from('workshop_translations')
      .select('title, tagline, description, audience')
      .eq('workshop_id', w.id).eq('locale_id', localeId).maybeSingle();
    results.push({ ...w, title: t?.title ?? null, tagline: t?.tagline ?? null, description: t?.description ?? null, audience: t?.audience ?? null });
  }
  return results;
}

export async function getWorkshop(id: string, localeCode: string = DEFAULT_LOCALE_CODE): Promise<WorkshopRow | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const localeId = await localeIdFor(client, localeCode);

  const { data: w, error } = await client
    .from('workshops')
    .select('id, slug, status, visible, featured, coming_soon, price_cents, currency, duration_minutes, capacity_min, capacity_max, location, icon_glyph, visual_variant, sort_order, updated_at')
    .eq('id', id).maybeSingle();
  if (error || !w) return null;

  const { data: t } = await client
    .from('workshop_translations')
    .select('title, tagline, description, audience')
    .eq('workshop_id', w.id).eq('locale_id', localeId).maybeSingle();

  return { ...w, title: t?.title ?? null, tagline: t?.tagline ?? null, description: t?.description ?? null, audience: t?.audience ?? null };
}

export interface WorkshopWritableFields {
  status?: 'draft' | 'published' | 'archived';
  visible?: boolean;
  featured?: boolean;
  coming_soon?: boolean;
  price_cents?: number | null;
  duration_minutes?: number | null;
  capacity_min?: number | null;
  capacity_max?: number | null;
  location?: string | null;
  icon_glyph?: string | null;
  visual_variant?: string | null;
}

export async function updateWorkshop(id: string, fields: WorkshopWritableFields): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'not-configured' };

  // Reject nonsensical numeric ranges — matches the brief's "valider toutes
  // les données reçues par l'admin".
  if (fields.capacity_min != null && fields.capacity_max != null && fields.capacity_min > fields.capacity_max) {
    return { ok: false, error: 'capacité minimale supérieure à la capacité maximale' };
  }
  if (fields.price_cents != null && fields.price_cents < 0) {
    return { ok: false, error: 'prix négatif refusé' };
  }

  const { error } = await client.from('workshops').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function updateWorkshopTranslation(
  workshopId: string,
  fields: { title?: string; tagline?: string; description?: string; audience?: string },
  localeCode: string = DEFAULT_LOCALE_CODE,
): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'not-configured' };
  const localeId = await localeIdFor(client, localeCode);
  if (!localeId) return { ok: false, error: `locale ${localeCode} not found` };

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && /<script[\s>]/i.test(value)) {
      return { ok: false, error: `champ "${key}" refusé : balise <script> non autorisée` };
    }
  }

  const { error } = await client
    .from('workshop_translations')
    .upsert({ workshop_id: workshopId, locale_id: localeId, ...fields }, { onConflict: 'workshop_id,locale_id' });
  return error ? { ok: false, error: error.message } : { ok: true };
}
