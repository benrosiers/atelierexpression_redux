// Typed access layer for /admin/testimonials. Same shape/philosophy as
// workshops.ts: staff-side (RLS lets an authenticated admin/editor see
// drafts), locale-parameterized, basic input validation on writes.

import { getSupabaseClient } from '../supabase/client';

export interface TestimonialRow {
  id: string;
  stable_key: string | null;
  status: 'draft' | 'published' | 'archived';
  visible: boolean;
  featured: boolean;
  is_placeholder: boolean;
  author_initials: string | null;
  sort_order: number;
  quote: string | null;
  author_role: string | null;
}

const DEFAULT_LOCALE_CODE = 'fr-CA';

async function localeIdFor(client: NonNullable<ReturnType<typeof getSupabaseClient>>, code: string) {
  const { data } = await client.from('locales').select('id').eq('code', code).maybeSingle();
  return data?.id ?? null;
}

export async function listTestimonials(localeCode: string = DEFAULT_LOCALE_CODE): Promise<TestimonialRow[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  const localeId = await localeIdFor(client, localeCode);

  const { data: testimonials, error } = await client
    .from('testimonials')
    .select('id, stable_key, status, visible, featured, is_placeholder, author_initials, sort_order')
    .order('sort_order', { ascending: true });
  if (error || !testimonials) return [];

  const results: TestimonialRow[] = [];
  for (const t of testimonials) {
    const { data: tr } = await client
      .from('testimonial_translations')
      .select('quote, author_role')
      .eq('testimonial_id', t.id).eq('locale_id', localeId).maybeSingle();
    results.push({ ...t, quote: tr?.quote ?? null, author_role: tr?.author_role ?? null });
  }
  return results;
}

export async function getTestimonial(id: string, localeCode: string = DEFAULT_LOCALE_CODE): Promise<TestimonialRow | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const localeId = await localeIdFor(client, localeCode);

  const { data: t, error } = await client
    .from('testimonials')
    .select('id, stable_key, status, visible, featured, is_placeholder, author_initials, sort_order')
    .eq('id', id).maybeSingle();
  if (error || !t) return null;

  const { data: tr } = await client
    .from('testimonial_translations')
    .select('quote, author_role')
    .eq('testimonial_id', t.id).eq('locale_id', localeId).maybeSingle();

  return { ...t, quote: tr?.quote ?? null, author_role: tr?.author_role ?? null };
}

export interface TestimonialWritableFields {
  status?: 'draft' | 'published' | 'archived';
  visible?: boolean;
  featured?: boolean;
  is_placeholder?: boolean;
  author_initials?: string | null;
}

export async function updateTestimonial(id: string, fields: TestimonialWritableFields): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'not-configured' };

  const { error } = await client.from('testimonials').update(fields).eq('id', id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function updateTestimonialTranslation(
  testimonialId: string,
  fields: { quote?: string; author_role?: string },
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
    .from('testimonial_translations')
    .upsert({ testimonial_id: testimonialId, locale_id: localeId, ...fields }, { onConflict: 'testimonial_id,locale_id' });
  return error ? { ok: false, error: error.message } : { ok: true };
}
