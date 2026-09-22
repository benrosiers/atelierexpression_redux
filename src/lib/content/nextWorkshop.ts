// Typed access layer for /admin/events — which edits the next_workshop
// singleton (see supabase/migrations/0010 and docs/NEXT_WORKSHOP_CONTENT_MODEL.md).
// Same shape/philosophy as workshops.ts/testimonials.ts/faq.ts: staff-side
// (RLS lets an authenticated admin/editor write), locale-parameterized.

import { getSupabaseClient } from '../supabase/client';

export type NextWorkshopStatus = 'building' | 'date-announced' | 'registration-open' | 'sold-out' | 'completed';

export interface NextWorkshopRow {
  id: string;
  status: NextWorkshopStatus;
  event_date: string | null;
  event_time: string | null;
  location: string | null;
  capacity: string | null;
  price_cents: number | null;
  registration_url: string | null;
  interest_form_url: string | null;
  short_description: string | null;
  details: string | null;
  cta_label: string | null;
}

const DEFAULT_LOCALE_CODE = 'fr-CA';

async function localeIdFor(client: NonNullable<ReturnType<typeof getSupabaseClient>>, code: string) {
  const { data } = await client.from('locales').select('id').eq('code', code).maybeSingle();
  return data?.id ?? null;
}

export async function getNextWorkshopRow(localeCode: string = DEFAULT_LOCALE_CODE): Promise<NextWorkshopRow | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const localeId = await localeIdFor(client, localeCode);

  const { data: nw, error } = await client
    .from('next_workshop')
    .select('id, status, event_date, event_time, location, capacity, price_cents, registration_url, interest_form_url')
    .eq('stable_key', 'next-workshop').maybeSingle();
  if (error || !nw) return null;

  const { data: t } = await client
    .from('next_workshop_translations')
    .select('short_description, details, cta_label')
    .eq('next_workshop_id', nw.id).eq('locale_id', localeId).maybeSingle();

  return { ...nw, short_description: t?.short_description ?? null, details: t?.details ?? null, cta_label: t?.cta_label ?? null };
}

export interface NextWorkshopWritableFields {
  status?: NextWorkshopStatus;
  event_date?: string | null;
  event_time?: string | null;
  location?: string | null;
  capacity?: string | null;
  price_cents?: number | null;
  registration_url?: string | null;
  interest_form_url?: string | null;
}

export async function updateNextWorkshop(id: string, fields: NextWorkshopWritableFields): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'not-configured' };

  if (fields.price_cents != null && fields.price_cents < 0) {
    return { ok: false, error: 'prix négatif refusé' };
  }
  if ((fields.status === 'date-announced' || fields.status === 'registration-open') && !fields.event_date) {
    return { ok: false, error: 'une date est requise pour ce statut' };
  }

  const { error } = await client.from('next_workshop').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function updateNextWorkshopTranslation(
  nextWorkshopId: string,
  fields: { short_description?: string; details?: string; cta_label?: string },
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
    .from('next_workshop_translations')
    .upsert({ next_workshop_id: nextWorkshopId, locale_id: localeId, ...fields }, { onConflict: 'next_workshop_id,locale_id' });
  return error ? { ok: false, error: error.message } : { ok: true };
}
