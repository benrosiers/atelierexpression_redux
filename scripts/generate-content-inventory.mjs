// Produces docs/admin/content-inventory.json (machine-readable) from the
// real src/data/*.ts collections, combined with a hand-curated list of the
// inline per-page arrays and component-level strings that aren't in
// separate data files (built up over the course of this project's redesign
// passes — see docs/admin/content-inventory.md for the human-readable
// version generated alongside this).
//
// Usage: node scripts/generate-content-inventory.mjs

import { register } from 'node:module';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

register('./ts-extension-loader.mjs', import.meta.url);

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function slugify(text) {
  return text.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

async function main() {
  const { faqs } = await import('../src/data/faqs.ts');
  const { offers } = await import('../src/data/offers.ts');
  const { events } = await import('../src/data/events.ts');
  const { testimonials } = await import('../src/data/testimonials.ts');

  const items = [];

  // ── site_settings (already migrated Phase 2A) ──────────────────────────
  ['site_identity', 'contact', 'social', 'seo_defaults', 'navigation_main', 'navigation_footer', 'cta_global', 'newsletter']
    .forEach((key) => items.push({
      source_file: key === 'navigation_main' || key === 'navigation_footer' || key === 'cta_global'
        ? 'src/data/navigation.ts' : 'src/data/site.ts',
      page: 'global', section: 'site_settings', content_type: 'global-config',
      stable_key: key, target_table: 'site_settings', target_field: 'value',
      translatable: false, status: 'migré',
    }));

  // ── FAQs ────────────────────────────────────────────────────────────────
  // Migrated: real copy from faqs.ts, fr-CA only, 6 categories + 16 questions
  // (scripts/seed-faq.mjs). Public cutover done: index.astro's 4-question
  // preview + faq.astro's full category-grouped page both read Supabase.
  faqs.forEach((faq, i) => items.push({
    source_file: 'src/data/faqs.ts', line_or_index: i, page: 'faq', section: faq.category ?? 'uncategorized',
    content_type: 'faq-item', stable_key: `faq-${i}`,
    target_table: 'faqs + faq_translations', target_field: 'question, answer',
    translatable: true, status: 'migré',
    note: (i === 10 ? '"Combien de personnes par atelier?" — answer was a template literal interpolating nextWorkshop.capacity; resolved to plain text at migration time, live link to nextWorkshop broken on purpose (now directly admin-editable). ' : '')
      + 'fr-CA seulement (en-CA pas encore traduit) — public cutover fait (accueil + /faq).',
  }));

  // ── Offers / workshops ───────────────────────────────────────────────────
  offers.forEach((offer) => items.push({
    source_file: 'src/data/offers.ts', page: 'ateliers', section: 'catalogue',
    content_type: 'workshop', stable_key: offer.id,
    target_table: 'workshops + workshop_translations',
    target_field: 'title, tagline(subtitle), description, duration_minutes, price_cents, capacity_*, location',
    translatable: true, status: 'migré',
    note: 'fr-CA seulement (en-CA pas encore traduit) — public /ateliers "Tous les ateliers" grid déjà branché',
  }));

  // ── Events (= the next_workshop singleton) ──────────────────────────────
  // Migrated: src/data/nextWorkshop.ts (the site's single source of
  // scheduling truth — status/date/price/capacity/CTA label) now lives in
  // next_workshop + next_workshop_translations (scripts/seed-next-workshop.mjs).
  // events.ts's one entry derives from it exactly as before, just re-sourced
  // — no separate events table, per the 2026-07-22 decision to keep a
  // single rolling "next workshop" rather than build a distinct-events model.
  // Public cutover done: every consumer (nav CTA, Hero, WorkshopCard,
  // ReservationForm, a-propos/ateliers/reserver/temoignages/evenements) reads
  // Supabase first, nextWorkshop.ts fallback preserved. Admin: /admin/events.
  events.forEach((event) => items.push({
    source_file: 'src/data/events.ts (derives from src/data/nextWorkshop.ts)', page: 'evenements', section: 'liste',
    content_type: 'event', stable_key: event.id,
    target_table: 'next_workshop + next_workshop_translations',
    target_field: 'status, event_date, event_time, location, capacity, price_cents, short_description, details, cta_label',
    translatable: true, status: 'migré',
    note: 'fr-CA seulement (en-CA pas encore traduit) — public cutover fait sur TOUS les consommateurs (nav, hero, ateliers, réserver, événements, à propos, témoignages)',
  }));

  // ── Testimonials ──────────────────────────────────────────────────────────
  // Migrated: real copy from testimonials.ts, fr-CA only (en-CA deferred —
  // schema/admin UI already support a locale switch, translation just not
  // filled in yet). Public cutover done: index.astro + temoignages.astro
  // both read from Supabase with the static array as fallback.
  testimonials.forEach((t, i) => items.push({
    source_file: 'src/data/testimonials.ts', line_or_index: i, page: 'temoignages + accueil',
    section: 'testimonials', content_type: 'testimonial', stable_key: `testimonial-${i}`,
    target_table: 'testimonials + testimonial_translations', target_field: 'quote, author_role',
    translatable: true, status: 'migré',
    note: (t.isPlaceholder ? 'FICTIONAL PLACEHOLDER — is_placeholder=true carried through migration, never presented as real. ' : '')
      + 'fr-CA seulement (en-CA pas encore traduit) — public cutover fait (accueil + /temoignages).',
  }));

  // ── Hero (section-level, not a repeated array) ──────────────────────────
  // Migrated: real copy from src/components/Hero.astro, fr-CA + en-CA both
  // seeded (scripts/seed-home-hero-and-en.mjs). Still authoritative in the
  // component itself — public site not yet switched over (Phase 5).
  items.push({
    source_file: 'src/components/Hero.astro', page: 'accueil', section: 'hero',
    content_type: 'section', stable_key: 'hero',
    target_table: 'sections + section_translations', target_field: 'eyebrow, title, subtitle, body, cta_label, cta_url',
    translatable: true, status: 'migré',
  });

  // ── Inline per-page arrays (not in src/data/*.ts — literals inside .astro
  // files, inventoried by hand during the Pass 5 redesign work) ────────────
  // Migrated (scripts/seed-inline-pages.mjs): fr-CA only, real copy from
  // each .astro file, seeded into pages/sections/content_items using the
  // SAME schema and admin editor already built for hero/pillars — no new
  // admin UI needed, /admin/pages/edit?slug=X already handles these
  // generically. Public cutover done on all 4 pages (a-propos, parcours,
  // ateliers, evenements), static arrays kept as fallback.
  //
  // 3 collections below (reconnect-list, breakdown, bring-list) were found
  // while reading these files for this pass and were NOT in the original
  // inventory — added and migrated alongside the ones that were.
  const inlineCollections = [
    // Migrated: real copy from ValuePillars.astro, fr-CA + en-CA both seeded
    // (scripts/seed-home-pillars.mjs + seed-home-hero-and-en.mjs).
    { page: 'accueil', section: 'pillars (ValuePillars)', count: 6, stable_prefix: 'pillar', source_file: 'src/pages/index.astro (via ValuePillars props)', status: 'migré' },
    { page: 'accueil', section: 'expression pastilles (express-grid)', count: 12, stable_prefix: 'express-grid', source_file: 'src/pages/index.astro', status: 'migré' },
    { page: 'accueil', section: 'forwhom-cards', count: 6, stable_prefix: 'forwhom-cards', source_file: 'src/pages/index.astro', status: 'migré', note: "trouvé en revisant index.astro pour la passe précédente, migré dans celle-ci" },
    { page: 'a-propos', section: 'why-items', count: 6, stable_prefix: 'why-items', source_file: 'src/pages/a-propos.astro', status: 'migré' },
    { page: 'a-propos', section: 'values/engagements', count: 6, stable_prefix: 'values', source_file: 'src/pages/a-propos.astro', status: 'migré' },
    { page: 'parcours', section: 'weekly modules', count: 6, stable_prefix: 'modules', source_file: 'src/pages/parcours.astro', status: 'migré' },
    { page: 'parcours', section: 'reconnect before/after list', count: 5, stable_prefix: 'reconnect-list', source_file: 'src/pages/parcours.astro', status: 'migré', note: "pas dans l'inventaire original — trouvé et migré en même temps que 'weekly modules'" },
    { page: 'ateliers', section: 'workshop breakdown (6 steps)', count: 6, stable_prefix: 'breakdown', source_file: 'src/pages/ateliers.astro', status: 'migré', note: "pas dans l'inventaire original — trouvé et migré en même temps que le reste de la page" },
    { page: 'ateliers', section: 'who-it-is-for cards', count: 6, stable_prefix: 'who-items', source_file: 'src/pages/ateliers.astro', status: 'migré' },
    { page: 'ateliers', section: 'expect-yes list', count: 8, stable_prefix: 'expect-yes', source_file: 'src/pages/ateliers.astro', status: 'migré' },
    { page: 'ateliers', section: 'expect-no list', count: 7, stable_prefix: 'expect-no', source_file: 'src/pages/ateliers.astro', status: 'migré' },
    { page: 'ateliers', section: 'what to bring list', count: 4, stable_prefix: 'bring-list', source_file: 'src/pages/ateliers.astro', status: 'migré', note: "pas dans l'inventaire original — trouvé et migré en même temps que le reste de la page" },
    { page: 'evenements', section: 'formats', count: 4, stable_prefix: 'formats', source_file: 'src/pages/evenements.astro', status: 'migré' },
  ];
  inlineCollections.forEach((c) => {
    for (let i = 0; i < c.count; i++) {
      items.push({
        source_file: c.source_file, page: c.page, section: c.section,
        content_type: 'inline-content-item', stable_key: `${slugify(c.page)}-${c.stable_prefix}-${i}`,
        target_table: 'content_items + content_item_translations', target_field: 'title/body/label (varies by item)',
        translatable: true, status: c.status ?? 'restant',
      });
    }
  });

  // ── Component-level UI strings (labels, form messages) ──────────────────
  // Header/Footer/Hero aria-labels are deliberately NOT in this list — see
  // "What's deliberately NOT going into the CMS" below. They're
  // accessibility markup, not editorial content, and the hamburger's
  // 'Ouvrir le menu'/'Fermer le menu' pair is string-matched by client JS
  // (Header.astro's toggle script), so migrating it would add real
  // regression surface for zero editorial benefit.
  const componentStrings = [
    { source_file: 'src/components/InterestForm.astro', content_type: 'form-message', label: 'submit label + success message (only the pure-text parts — error/not-configured embed a mailto link and stay hardcoded)', target_table: 'site_settings (form_messages.interest)' },
    { source_file: 'src/components/NewsletterSignup.astro', content_type: 'form-message', label: 'submit label + success message (same carve-out as above)', target_table: 'site_settings (form_messages.newsletter)' },
    { source_file: 'src/components/ReservationForm.astro', content_type: 'form-message', label: 'submit label + success title/body (same carve-out as above)', target_table: 'site_settings (form_messages.reservation)' },
    { source_file: 'src/pages/contact.astro', content_type: 'form-message', label: 'submit label + success message (same carve-out as above)', target_table: 'site_settings (form_messages.contact)' },
    { source_file: 'all 12 pages except reserver.astro (BaseLayout title/description props)', content_type: 'seo', label: 'per-page SEO title + meta description', target_table: 'pages + page_translations (seo_title/seo_description)' },
    { source_file: 'src/components/BaseLayout.astro', content_type: 'seo-jsonld', label: 'Organization JSON-LD (name, url, description, sameAs) — read from site_identity/social, closing the prior duplication', target_table: 'site_settings (site_identity, social)' },
  ];
  componentStrings.forEach((c) => items.push({
    source_file: c.source_file, page: 'various', section: 'component-level',
    content_type: c.content_type, stable_key: null, target_table: c.target_table,
    target_field: c.label, translatable: c.content_type !== 'form-message', status: 'migré',
  }));

  const outPath = path.join(rootDir, 'docs', 'admin', 'content-inventory.json');
  writeFileSync(outPath, JSON.stringify({ generated_at: new Date().toISOString(), total_items: items.length, items }, null, 2));

  const migrated = items.filter((i) => i.status === 'migré').length;
  console.log(`Wrote ${items.length} inventory items to docs/admin/content-inventory.json`);
  console.log(`  migré: ${migrated}`);
  console.log(`  restant: ${items.length - migrated}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
