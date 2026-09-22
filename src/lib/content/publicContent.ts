// Public-site read layer — the OTHER half of the CMS pipeline from
// pages.ts (which is the admin's read/write layer for drafts). This file
// is what makes editing content in /admin actually visible on the live
// site: it's read at BUILD TIME (Astro static output, top-level await in
// component frontmatter), published+visible only, with the caller always
// providing its own static fallback — never throws, never returns partial
// garbage that would render as broken text.
//
// Deliberately separate from src/lib/content/pages.ts: that file trusts an
// authenticated staff session (RLS lets it see drafts); this file must work
// with ZERO session (anonymous, build-time, no browser) and only ever see
// what RLS's "public read published" policies allow.

import { createClient } from '@supabase/supabase-js';

function getBuildTimeClient() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) return null;
  try {
    return createClient(url, key, { auth: { persistSession: false } });
  } catch {
    return null;
  }
}

export interface PublicSectionContent {
  eyebrow: string | null;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
}

export interface PublicContentItem {
  stableKey: string;
  iconKey: string | null;
  visualVariant: string | null;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  label: string | null;
}

// Shape matches src/data/offers.ts's Offer interface exactly, so
// WorkshopCard.astro (which takes an Offer prop) needs zero changes —
// only the data source behind it changes.
export interface PublicWorkshop {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  duration: string;
  groupSize: string;
  price: string;
  location: string;
  level: string;
  status: 'active' | 'coming-soon';
  accentColor: 'fuchsia' | 'corail' | 'soleil' | 'emeraude';
  icon: string;
  href: string;
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return '';
  const hours = minutes / 60;
  return hours === 1 ? '1 heure' : `${hours % 1 === 0 ? hours : hours.toFixed(1)} heures`;
}

function formatPrice(cents: number | null, currency: string): string {
  if (cents == null) return 'À venir';
  return `${(cents / 100).toFixed(0)} $ ${currency === 'CAD' ? 'CA' : currency}`;
}

function formatCapacity(min: number | null, max: number | null): string {
  if (min == null || max == null) return '';
  return `${min} à ${max} personnes`;
}

// Shape matches src/data/testimonials.ts's Testimonial interface exactly,
// so TestimonialCard.astro needs zero changes.
export interface PublicTestimonial {
  quote: string;
  name: string;
  detail: string;
  isPlaceholder: boolean;
}

// Shape matches src/data/faqs.ts's FAQ interface exactly, so FAQAccordion.astro
// and faq.astro's own category-filter logic (which checks `f.category ===
// 'accessibilité'`, etc. — the original lowercase-accented strings) both
// need zero changes.
export interface PublicFAQ {
  question: string;
  answer: string;
  category?: string;
}

// Maps a faq_categories.stable_key back to the exact lowercase-accented
// string faqs.ts used in its `category` field (and that faq.astro's filter
// logic still checks against) — see the comment in seed-faq.mjs.
const CATEGORY_STABLE_KEY_TO_LEGACY_VALUE: Record<string, string> = {
  accessibilite: 'accessibilité',
  contenu: 'contenu',
  format: 'format',
  pratique: 'pratique',
  securite: 'sécurité',
  futur: 'futur',
};

// Shape matches src/data/nextWorkshop.ts's NextWorkshop interface exactly.
export interface PublicNextWorkshop {
  status: 'building' | 'date-announced' | 'registration-open' | 'sold-out' | 'completed';
  date: string | null;
  time: string | null;
  location: string;
  capacity: string;
  price: string;
  registrationUrl: string | null;
  interestFormUrl: string | null;
  shortDescription: string;
  details: string;
  ctaLabel: string;
}

function formatEventDate(isoDate: string | null): string | null {
  if (!isoDate) return null;
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Returns null on any failure — caller falls back to its own static
// src/data/nextWorkshop.ts object, same contract as getSectionContent().
export async function getNextWorkshop(localeCode: string = 'fr-CA'): Promise<PublicNextWorkshop | null> {
  const client = getBuildTimeClient();
  if (!client) return null;

  try {
    const { data: locale } = await client.from('locales').select('id').eq('code', localeCode).maybeSingle();
    if (!locale) return null;

    const { data: nw } = await client
      .from('next_workshop')
      .select('id, status, event_date, event_time, location, capacity, price_cents, registration_url, interest_form_url')
      .eq('stable_key', 'next-workshop').maybeSingle();
    if (!nw) return null;

    const { data: t } = await client
      .from('next_workshop_translations')
      .select('short_description, details, cta_label')
      .eq('next_workshop_id', nw.id).eq('locale_id', locale.id).maybeSingle();
    if (!t) return null;

    return {
      status: nw.status,
      date: formatEventDate(nw.event_date),
      time: nw.event_time,
      location: nw.location ?? '',
      capacity: nw.capacity ?? '',
      price: formatPrice(nw.price_cents, 'CAD'),
      registrationUrl: nw.registration_url,
      interestFormUrl: nw.interest_form_url,
      shortDescription: t.short_description ?? '',
      details: t.details ?? '',
      ctaLabel: t.cta_label ?? '',
    };
  } catch {
    return null;
  }
}

// Shape matches src/data/events.ts's Event interface exactly. Builds its
// single entry from getNextWorkshop(), mirroring events.ts's own derivation
// logic (see the comment there) — never duplicates the scheduling facts.
export interface PublicEvent {
  id: string;
  title: string;
  date: string | null;
  time: string | null;
  location: string;
  description: string;
  price: string;
  status: 'upcoming' | 'announced-soon' | 'past';
  href: string;
}

export async function getEvents(localeCode: string = 'fr-CA'): Promise<PublicEvent[]> {
  const nw = await getNextWorkshop(localeCode);
  if (!nw) return [];

  return [{
    id: 'atelier-decouverte-prochain',
    title: 'Atelier découverte',
    date: nw.date,
    time: nw.time,
    location: nw.location,
    description: nw.details,
    price: nw.price,
    status: nw.status === 'building' ? 'announced-soon' : 'upcoming',
    href: '/reserver',
  }];
}

// Returns [] on any failure — caller falls back to its own static array
// (src/data/offers.ts), same contract as getSectionItems().
export async function getWorkshops(localeCode: string = 'fr-CA'): Promise<PublicWorkshop[]> {
  const client = getBuildTimeClient();
  if (!client) return [];

  try {
    const { data: locale } = await client.from('locales').select('id').eq('code', localeCode).maybeSingle();
    if (!locale) return [];

    const { data: workshops } = await client
      .from('workshops')
      .select('id, slug, featured, coming_soon, price_cents, currency, duration_minutes, capacity_min, capacity_max, location, icon_glyph, visual_variant')
      .eq('status', 'published').eq('visible', true)
      .order('sort_order', { ascending: true });
    if (!workshops || workshops.length === 0) return [];

    const results: PublicWorkshop[] = [];
    for (const w of workshops) {
      const { data: t } = await client
        .from('workshop_translations')
        .select('title, tagline, description, audience')
        .eq('workshop_id', w.id).eq('locale_id', locale.id).maybeSingle();
      if (!t) continue;

      results.push({
        id: w.slug,
        title: t.title ?? '',
        subtitle: t.tagline ?? '',
        description: t.description ?? '',
        duration: formatDuration(w.duration_minutes),
        groupSize: formatCapacity(w.capacity_min, w.capacity_max),
        price: formatPrice(w.price_cents, w.currency),
        location: w.location ?? '',
        level: t.audience ?? '',
        status: w.coming_soon ? 'coming-soon' : 'active',
        accentColor: (w.visual_variant ?? 'fuchsia') as PublicWorkshop['accentColor'],
        icon: w.icon_glyph ?? '✦',
        href: '/ateliers',
      });
    }
    return results;
  } catch {
    return [];
  }
}

// Returns [] on any failure — caller falls back to its own static array
// (src/data/testimonials.ts), same contract as getWorkshops().
export async function getTestimonials(localeCode: string = 'fr-CA'): Promise<PublicTestimonial[]> {
  const client = getBuildTimeClient();
  if (!client) return [];

  try {
    const { data: locale } = await client.from('locales').select('id').eq('code', localeCode).maybeSingle();
    if (!locale) return [];

    const { data: testimonials } = await client
      .from('testimonials')
      .select('id, author_initials, is_placeholder')
      .eq('status', 'published').eq('visible', true)
      .order('sort_order', { ascending: true });
    if (!testimonials || testimonials.length === 0) return [];

    const results: PublicTestimonial[] = [];
    for (const t of testimonials) {
      const { data: tr } = await client
        .from('testimonial_translations')
        .select('quote, author_role')
        .eq('testimonial_id', t.id).eq('locale_id', locale.id).maybeSingle();
      if (!tr) continue;

      results.push({
        quote: tr.quote ?? '',
        name: t.author_initials ?? '',
        detail: tr.author_role ?? '',
        isPlaceholder: t.is_placeholder,
      });
    }
    return results;
  } catch {
    return [];
  }
}

// Returns [] on any failure — caller falls back to its own static array
// (src/data/faqs.ts), same contract as getWorkshops()/getTestimonials().
export async function getFaqs(localeCode: string = 'fr-CA'): Promise<PublicFAQ[]> {
  const client = getBuildTimeClient();
  if (!client) return [];

  try {
    const { data: locale } = await client.from('locales').select('id').eq('code', localeCode).maybeSingle();
    if (!locale) return [];

    const { data: categories } = await client.from('faq_categories').select('id, stable_key');
    const legacyValueByCategoryId = new Map(
      (categories ?? []).map((c) => [c.id, CATEGORY_STABLE_KEY_TO_LEGACY_VALUE[c.stable_key] ?? c.stable_key]),
    );

    const { data: faqs } = await client
      .from('faqs')
      .select('id, category_id')
      .eq('status', 'published').eq('visible', true)
      .order('sort_order', { ascending: true });
    if (!faqs || faqs.length === 0) return [];

    const results: PublicFAQ[] = [];
    for (const f of faqs) {
      const { data: t } = await client
        .from('faq_translations')
        .select('question, answer')
        .eq('faq_id', f.id).eq('locale_id', locale.id).maybeSingle();
      if (!t) continue;

      results.push({
        question: t.question ?? '',
        answer: t.answer ?? '',
        category: f.category_id ? legacyValueByCategoryId.get(f.category_id) : undefined,
      });
    }
    return results;
  } catch {
    return [];
  }
}

// Returns null on ANY failure (not configured, network error, page/section
// not found, not published, not visible) — callers must always have a
// static fallback ready and use it when this returns null. Never throws.
export async function getSectionContent(
  pageSlug: string,
  sectionKey: string,
  localeCode: string = 'fr-CA',
): Promise<PublicSectionContent | null> {
  const client = getBuildTimeClient();
  if (!client) return null;

  try {
    const { data: page } = await client
      .from('pages').select('id').eq('slug', pageSlug).eq('status', 'published').eq('visible', true).maybeSingle();
    if (!page) return null;

    const { data: section } = await client
      .from('sections').select('id').eq('page_id', page.id).eq('stable_key', sectionKey).eq('visible', true).maybeSingle();
    if (!section) return null;

    const { data: locale } = await client.from('locales').select('id').eq('code', localeCode).maybeSingle();
    if (!locale) return null;

    const { data: translation } = await client
      .from('section_translations')
      .select('eyebrow, title, subtitle, body, cta_label, cta_url')
      .eq('section_id', section.id).eq('locale_id', locale.id).maybeSingle();
    if (!translation) return null;

    return {
      eyebrow: translation.eyebrow, title: translation.title, subtitle: translation.subtitle,
      body: translation.body, ctaLabel: translation.cta_label, ctaUrl: translation.cta_url,
    };
  } catch {
    return null;
  }
}

// Returns null on ANY failure — caller falls back to its own static value.
// `site_settings` has no draft/published gate (see 0006_row_level_security.sql:
// "public read site settings" is unconditional), so unlike the functions
// above there's no status/visible filter here.
export async function getPublicSiteSetting<T = unknown>(key: string): Promise<T | null> {
  const client = getBuildTimeClient();
  if (!client) return null;

  try {
    const { data } = await client.from('site_settings').select('value').eq('key', key).maybeSingle();
    return data ? (data.value as T) : null;
  } catch {
    return null;
  }
}

// Shape matches SiteSettingsMap['form_messages'] in
// src/lib/content/siteSettings.ts (the admin-side type map) — duplicated
// here rather than imported because that file pulls in the browser
// Supabase client, which build-time frontmatter must not import.
export interface FormMessagesSetting {
  interest: { submitLabel: string; loadingLabel: string; successMessage: string };
  reservation: { submitLabel: string; loadingLabel: string; successTitle: string; successBody: string };
  newsletter: { submitLabel: string; loadingLabel: string; successMessage: string };
  contact: { submitLabel: string; loadingLabel: string; successMessage: string };
}

export interface PublicPageSeo {
  title: string | null;
  description: string | null;
}

// Returns null on ANY failure — caller falls back to its own static
// title/description prop, same contract as getSectionContent(). Deliberately
// separate from getSectionContent(): reads page_translations directly, no
// section involved.
export async function getPageSeo(
  pageSlug: string,
  localeCode: string = 'fr-CA',
): Promise<PublicPageSeo | null> {
  const client = getBuildTimeClient();
  if (!client) return null;

  try {
    const { data: page } = await client
      .from('pages').select('id').eq('slug', pageSlug).eq('status', 'published').eq('visible', true).maybeSingle();
    if (!page) return null;

    const { data: locale } = await client.from('locales').select('id').eq('code', localeCode).maybeSingle();
    if (!locale) return null;

    const { data: translation } = await client
      .from('page_translations')
      .select('seo_title, seo_description')
      .eq('page_id', page.id).eq('locale_id', locale.id).maybeSingle();
    if (!translation) return null;

    return { title: translation.seo_title, description: translation.seo_description };
  } catch {
    return null;
  }
}

// Returns [] on ANY failure — callers fall back to their own static array
// when this returns an empty list.
export async function getSectionItems(
  pageSlug: string,
  sectionKey: string,
  localeCode: string = 'fr-CA',
): Promise<PublicContentItem[]> {
  const client = getBuildTimeClient();
  if (!client) return [];

  try {
    const { data: page } = await client
      .from('pages').select('id').eq('slug', pageSlug).eq('status', 'published').eq('visible', true).maybeSingle();
    if (!page) return [];

    const { data: section } = await client
      .from('sections').select('id').eq('page_id', page.id).eq('stable_key', sectionKey).eq('visible', true).maybeSingle();
    if (!section) return [];

    const { data: locale } = await client.from('locales').select('id').eq('code', localeCode).maybeSingle();
    if (!locale) return [];

    const { data: items } = await client
      .from('content_items')
      .select('id, stable_key, icon_key, visual_variant, sort_order')
      .eq('section_id', section.id).eq('status', 'published').eq('visible', true)
      .order('sort_order', { ascending: true });
    if (!items || items.length === 0) return [];

    const results: PublicContentItem[] = [];
    for (const item of items) {
      const { data: t } = await client
        .from('content_item_translations')
        .select('title, subtitle, body, label')
        .eq('content_item_id', item.id).eq('locale_id', locale.id).maybeSingle();
      if (!t) continue; // skip items with no translation rather than render blank
      results.push({
        stableKey: item.stable_key, iconKey: item.icon_key, visualVariant: item.visual_variant,
        title: t.title, subtitle: t.subtitle, body: t.body, label: t.label,
      });
    }
    return results;
  } catch {
    return [];
  }
}
