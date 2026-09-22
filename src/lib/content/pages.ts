// Typed access layer for pages/sections/content_items — admin-side only for
// now (staff RLS policies let an authenticated admin/editor read everything
// including drafts; the public getPage()/getSection()/getContentItems()
// equivalents for Phase 5 will filter to published+visible only and are not
// built yet — this file is the CMS editor's data layer, not the public
// site's).

import { getSupabaseClient } from '../supabase/client';

export interface PageRow {
  id: string;
  slug: string;
  page_type: string;
  status: 'draft' | 'published' | 'archived';
  visible: boolean;
  sort_order: number;
  updated_at: string;
  title: string | null;
  section_count: number;
}

export interface SectionRow {
  id: string;
  stable_key: string;
  component_type: string;
  visual_variant: string | null;
  visible: boolean;
  sort_order: number;
  eyebrow: string | null;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  cta_label: string | null;
  cta_url: string | null;
  item_count: number;
}

export interface ContentItemRow {
  id: string;
  item_type: string;
  stable_key: string;
  visual_variant: string | null;
  icon_key: string | null;
  visible: boolean;
  sort_order: number;
  status: 'draft' | 'published' | 'archived';
  title: string | null;
  subtitle: string | null;
  body: string | null;
  label: string | null;
}

export interface LocaleRow {
  id: string;
  code: string;
  label: string;
  enabled: boolean;
  is_default: boolean;
}

const DEFAULT_LOCALE_CODE = 'fr-CA';

async function localeIdFor(client: NonNullable<ReturnType<typeof getSupabaseClient>>, code: string) {
  const { data } = await client.from('locales').select('id').eq('code', code).maybeSingle();
  return data?.id ?? null;
}

export async function listLocales(): Promise<LocaleRow[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from('locales')
    .select('id, code, label, enabled, is_default')
    .order('sort_order', { ascending: true });
  return error || !data ? [] : data;
}

export async function listPages(localeCode: string = DEFAULT_LOCALE_CODE): Promise<PageRow[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  const localeId = await localeIdFor(client, localeCode);

  const { data: pages, error } = await client
    .from('pages')
    .select('id, slug, page_type, status, visible, sort_order, updated_at')
    .order('sort_order', { ascending: true });
  if (error || !pages) return [];

  const results: PageRow[] = [];
  for (const page of pages) {
    const { data: translation } = await client
      .from('page_translations')
      .select('title')
      .eq('page_id', page.id)
      .eq('locale_id', localeId)
      .maybeSingle();

    const { count } = await client
      .from('sections')
      .select('id', { count: 'exact', head: true })
      .eq('page_id', page.id);

    results.push({ ...page, title: translation?.title ?? null, section_count: count ?? 0 });
  }
  return results;
}

export async function getPageBySlug(
  slug: string,
  localeCode: string = DEFAULT_LOCALE_CODE,
): Promise<{ page: PageRow; sections: SectionRow[] } | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const localeId = await localeIdFor(client, localeCode);

  const { data: page, error: pageError } = await client
    .from('pages')
    .select('id, slug, page_type, status, visible, sort_order, updated_at')
    .eq('slug', slug)
    .maybeSingle();
  if (pageError || !page) return null;

  const { data: pageTranslation } = await client
    .from('page_translations').select('title').eq('page_id', page.id).eq('locale_id', localeId).maybeSingle();

  const { data: sectionsRaw, error: sectionsError } = await client
    .from('sections')
    .select('id, stable_key, component_type, visual_variant, visible, sort_order')
    .eq('page_id', page.id)
    .order('sort_order', { ascending: true });
  if (sectionsError || !sectionsRaw) return { page: { ...page, title: pageTranslation?.title ?? null, section_count: 0 }, sections: [] };

  const sections: SectionRow[] = [];
  for (const section of sectionsRaw) {
    const { data: st } = await client
      .from('section_translations')
      .select('eyebrow, title, subtitle, body, cta_label, cta_url')
      .eq('section_id', section.id).eq('locale_id', localeId).maybeSingle();

    const { count } = await client
      .from('content_items').select('id', { count: 'exact', head: true }).eq('section_id', section.id);

    sections.push({
      ...section,
      eyebrow: st?.eyebrow ?? null, title: st?.title ?? null, subtitle: st?.subtitle ?? null,
      body: st?.body ?? null, cta_label: st?.cta_label ?? null, cta_url: st?.cta_url ?? null,
      item_count: count ?? 0,
    });
  }

  return { page: { ...page, title: pageTranslation?.title ?? null, section_count: sections.length }, sections };
}

export async function getContentItems(
  sectionId: string,
  localeCode: string = DEFAULT_LOCALE_CODE,
): Promise<ContentItemRow[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  const localeId = await localeIdFor(client, localeCode);

  const { data: items, error } = await client
    .from('content_items')
    .select('id, item_type, stable_key, visual_variant, icon_key, visible, sort_order, status')
    .eq('section_id', sectionId)
    .order('sort_order', { ascending: true });
  if (error || !items) return [];

  const results: ContentItemRow[] = [];
  for (const item of items) {
    const { data: t } = await client
      .from('content_item_translations')
      .select('title, subtitle, body, label')
      .eq('content_item_id', item.id).eq('locale_id', localeId).maybeSingle();
    results.push({ ...item, title: t?.title ?? null, subtitle: t?.subtitle ?? null, body: t?.body ?? null, label: t?.label ?? null });
  }
  return results;
}

// Which locales (by code) have a translation row at all for this item, so
// the editor can show "traduction manquante" per locale instead of just
// silently falling back — the brief is explicit that fallback must always
// be visible, never silent.
export async function getContentItemTranslationStatus(itemId: string): Promise<Record<string, boolean>> {
  const client = getSupabaseClient();
  if (!client) return {};

  const locales = await listLocales();
  const { data } = await client
    .from('content_item_translations')
    .select('locale_id, title, body, label')
    .eq('content_item_id', itemId);

  const status: Record<string, boolean> = {};
  for (const locale of locales) {
    const row = data?.find((d) => d.locale_id === locale.id);
    // "complete" = has at least one non-empty text field. Not every content
    // type uses both title and body (e.g. a simple icon+sentence item only
    // fills body) — requiring both produced false "missing" flags for those
    // shapes even when the actual content was present and correct.
    status[locale.code] = !!row && (!!row.title?.trim() || !!row.body?.trim() || !!row.label?.trim());
  }
  return status;
}

export async function updateSectionVisibility(sectionId: string, visible: boolean): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'not-configured' };
  const { error } = await client.from('sections').update({ visible, updated_at: new Date().toISOString() }).eq('id', sectionId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function updateContentItemVisibility(itemId: string, visible: boolean): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'not-configured' };
  const { error } = await client.from('content_items').update({ visible, updated_at: new Date().toISOString() }).eq('id', itemId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function updateContentItemStatus(
  itemId: string,
  status: 'draft' | 'published' | 'archived',
): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'not-configured' };
  const { error } = await client.from('content_items').update({ status, updated_at: new Date().toISOString() }).eq('id', itemId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function updateContentItemTranslation(
  itemId: string,
  fields: { title?: string; subtitle?: string; body?: string; label?: string },
  localeCode: string = DEFAULT_LOCALE_CODE,
): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'not-configured' };
  const localeId = await localeIdFor(client, localeCode);
  if (!localeId) return { ok: false, error: `locale ${localeCode} not found` };

  // Reject obviously-unsafe input rather than trusting the admin UI blindly
  // — matches the brief's "valider toutes les données reçues par l'admin".
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && /<script[\s>]/i.test(value)) {
      return { ok: false, error: `champ "${key}" refusé : balise <script> non autorisée` };
    }
  }

  const { error } = await client
    .from('content_item_translations')
    .upsert({ content_item_id: itemId, locale_id: localeId, ...fields }, { onConflict: 'content_item_id,locale_id' });
  return error ? { ok: false, error: error.message } : { ok: true };
}
