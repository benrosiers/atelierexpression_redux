// Typed access layer for /admin/faq. Same shape/philosophy as
// workshops.ts/testimonials.ts: staff-side (RLS lets an authenticated
// admin/editor see drafts), locale-parameterized, basic input validation
// on writes.

import { getSupabaseClient } from '../supabase/client';

export interface FaqCategoryRow {
  id: string;
  stable_key: string;
  visible: boolean;
  sort_order: number;
  title: string | null;
}

export interface FaqRow {
  id: string;
  stable_key: string | null;
  category_id: string | null;
  status: 'draft' | 'published' | 'archived';
  visible: boolean;
  sort_order: number;
  question: string | null;
  answer: string | null;
}

const DEFAULT_LOCALE_CODE = 'fr-CA';

async function localeIdFor(client: NonNullable<ReturnType<typeof getSupabaseClient>>, code: string) {
  const { data } = await client.from('locales').select('id').eq('code', code).maybeSingle();
  return data?.id ?? null;
}

export async function listFaqCategories(localeCode: string = DEFAULT_LOCALE_CODE): Promise<FaqCategoryRow[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  const localeId = await localeIdFor(client, localeCode);

  const { data: categories, error } = await client
    .from('faq_categories')
    .select('id, stable_key, visible, sort_order')
    .order('sort_order', { ascending: true });
  if (error || !categories) return [];

  const results: FaqCategoryRow[] = [];
  for (const c of categories) {
    const { data: t } = await client
      .from('faq_category_translations')
      .select('title')
      .eq('category_id', c.id).eq('locale_id', localeId).maybeSingle();
    results.push({ ...c, title: t?.title ?? null });
  }
  return results;
}

export async function listFaqs(localeCode: string = DEFAULT_LOCALE_CODE): Promise<FaqRow[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  const localeId = await localeIdFor(client, localeCode);

  const { data: faqs, error } = await client
    .from('faqs')
    .select('id, stable_key, category_id, status, visible, sort_order')
    .order('sort_order', { ascending: true });
  if (error || !faqs) return [];

  const results: FaqRow[] = [];
  for (const f of faqs) {
    const { data: t } = await client
      .from('faq_translations')
      .select('question, answer')
      .eq('faq_id', f.id).eq('locale_id', localeId).maybeSingle();
    results.push({ ...f, question: t?.question ?? null, answer: t?.answer ?? null });
  }
  return results;
}

export async function getFaq(id: string, localeCode: string = DEFAULT_LOCALE_CODE): Promise<FaqRow | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const localeId = await localeIdFor(client, localeCode);

  const { data: f, error } = await client
    .from('faqs')
    .select('id, stable_key, category_id, status, visible, sort_order')
    .eq('id', id).maybeSingle();
  if (error || !f) return null;

  const { data: t } = await client
    .from('faq_translations')
    .select('question, answer')
    .eq('faq_id', f.id).eq('locale_id', localeId).maybeSingle();

  return { ...f, question: t?.question ?? null, answer: t?.answer ?? null };
}

export interface FaqWritableFields {
  category_id?: string | null;
  status?: 'draft' | 'published' | 'archived';
  visible?: boolean;
}

export async function updateFaq(id: string, fields: FaqWritableFields): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'not-configured' };

  const { error } = await client.from('faqs').update(fields).eq('id', id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function updateFaqTranslation(
  faqId: string,
  fields: { question?: string; answer?: string },
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
    .from('faq_translations')
    .upsert({ faq_id: faqId, locale_id: localeId, ...fields }, { onConflict: 'faq_id,locale_id' });
  return error ? { ok: false, error: error.message } : { ok: true };
}
