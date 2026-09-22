// Phase 2 continuation: (1) adds the homepage hero as a real `sections` row
// (real copy from src/components/Hero.astro, not invented), and (2) adds
// real en-CA translations for the hero + the 6 pillars seeded earlier —
// proving the fr-CA/en-CA locale tabs work against real bilingual content,
// not just empty fallback state. Idempotent (upsert by stable_key).
//
// Usage: node scripts/seed-home-hero-and-en.mjs --apply

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const apply = process.argv.includes('--apply');

function loadEnv() {
  const text = readFileSync(path.join(rootDir, '.env'), 'utf-8');
  const env = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

// Real copy, fr-CA from src/components/Hero.astro; en-CA is a direct human
// translation of the same copy (not a paraphrase, not auto-translated).
const hero = {
  fr: {
    eyebrow: 'pour adultes vivants',
    title: "Pas performer. Pas survivre. S'exprimer.",
    subtitle: "Le contraire de la dépression, ce n'est peut-être pas la performance. C'est peut-être l'expression.",
    body: "Des ateliers pour adultes qui veulent retrouver leur voix, leur corps, leur joie. Aucun talent requis. Aucune performance attendue.",
    cta_label: "Découvrir l'atelier",
    cta_url: '/ateliers',
  },
  en: {
    eyebrow: 'for adults who feel alive',
    title: 'Not performing. Not surviving. Expressing.',
    subtitle: 'The opposite of depression may not be performance. It may be expression.',
    body: 'Workshops for adults who want to reclaim their voice, their body, their joy. No talent required. No performance expected.',
    cta_label: 'Discover the workshop',
    cta_url: '/ateliers',
  },
};

const pillarsEn = {
  rire: { title: 'Laughter', description: "Laughter as the first tool. Not performed laughter — the laughter that just comes out, awkward and real." },
  jeu: { title: 'Play', description: 'The exercises are simple and accessible. We play. We try. We start again. No score.' },
  corps: { title: 'Body', description: 'Expression happens through the body. We move a little. Nothing athletic. Just re-inhabiting your own skin.' },
  voix: { title: 'Voice', description: 'Speak, boom, whisper, make noise. Reclaim the right to exist with your voice.' },
  presence: { title: 'Presence', description: 'Being there, fully. Not in your head, not in your worries. Just there, with others.' },
  cercle: { title: 'Circle', description: 'Every workshop ends with a sharing circle. Short, free, no pressure. You can just listen.' },
};

async function main() {
  console.log(`${apply ? 'APPLYING' : 'DRY RUN (pass --apply to write)'}`);
  console.log('Would create/update: sections.hero (fr-CA + en-CA), 6 pillar content_item_translations (en-CA)');
  if (!apply) { console.log('\nNo changes written. Re-run with --apply.'); return; }

  const env = loadEnv();
  const admin = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: frLocale } = await admin.from('locales').select('id').eq('code', 'fr-CA').single();
  const { data: enLocale } = await admin.from('locales').select('id').eq('code', 'en-CA').single();
  const { data: page } = await admin.from('pages').select('id').eq('slug', 'home').single();
  if (!page) { console.error('home page not found — run seed-home-pillars.mjs first'); process.exit(1); }

  const { data: section, error: sectionErr } = await admin
    .from('sections')
    .upsert({ page_id: page.id, stable_key: 'hero', component_type: 'hero', visible: true, sort_order: 0 }, { onConflict: 'page_id,stable_key' })
    .select('id').single();
  if (sectionErr) { console.error('section upsert failed:', sectionErr.message); process.exit(1); }
  console.log(`OK: section "hero" (id: ${section.id})`);

  for (const [locale, copy] of [[frLocale, hero.fr], [enLocale, hero.en]]) {
    const { error } = await admin.from('section_translations').upsert({
      section_id: section.id, locale_id: locale.id,
      eyebrow: copy.eyebrow, title: copy.title, subtitle: copy.subtitle, body: copy.body,
      cta_label: copy.cta_label, cta_url: copy.cta_url,
    }, { onConflict: 'section_id,locale_id' });
    if (error) { console.error('section_translations upsert failed:', error.message); process.exit(1); }
  }
  console.log('OK: hero translations (fr-CA + en-CA)');

  const { data: pillarSection } = await admin.from('sections').select('id').eq('page_id', page.id).eq('stable_key', 'pillars').single();
  for (const [key, copy] of Object.entries(pillarsEn)) {
    const { data: item } = await admin.from('content_items').select('id').eq('section_id', pillarSection.id).eq('stable_key', key).single();
    if (!item) { console.error(`pillar ${key} not found`); continue; }
    const { error } = await admin.from('content_item_translations').upsert({
      content_item_id: item.id, locale_id: enLocale.id, title: copy.title, body: copy.description,
    }, { onConflict: 'content_item_id,locale_id' });
    if (error) console.error(`pillar ${key} en-CA failed:`, error.message);
    else console.log(`OK: pillar "${key}" en-CA translation`);
  }

  console.log('\nSeed complete.');
}

main().catch((err) => { console.error(err); process.exit(1); });
