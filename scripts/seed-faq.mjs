// Phase 3 continued: migrates src/data/faqs.ts (16 questions, 6 categories)
// into faq_categories/faq_category_translations + faqs/faq_translations.
// Idempotent (upsert by stable_key). Never touches faqs.ts — public cutover
// is a separate step, same as workshops/testimonials.
//
// One deliberate content decision, flagged here and in the content
// inventory: the "Combien de personnes par atelier?" answer is a template
// literal in faqs.ts that interpolates `nextWorkshop.capacity` at build
// time. Once migrated, the admin owns this text directly — the resolved
// string (with today's capacity value baked in) is seeded as plain text,
// and it will need a manual admin edit if nextWorkshop.capacity changes
// later. This is a one-way move: the live link to nextWorkshop is broken
// on purpose, in exchange for making the answer directly editable by Cindy.
//
// Usage: node scripts/seed-faq.mjs --apply

import { register } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

register('./ts-extension-loader.mjs', import.meta.url);

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

// stable_key/legacy_value pairs mirror the category ids + filter strings
// already hardcoded in src/pages/faq.astro, so the public read layer can
// hand back data shaped exactly like the original faqs.ts array.
const CATEGORY_DEFS = [
  { stable_key: 'accessibilite', title: 'Accessibilité', legacy_value: 'accessibilité' },
  { stable_key: 'contenu', title: 'Contenu', legacy_value: 'contenu' },
  { stable_key: 'format', title: 'Format', legacy_value: 'format' },
  { stable_key: 'pratique', title: 'Pratique', legacy_value: 'pratique' },
  { stable_key: 'securite', title: 'Sécurité', legacy_value: 'sécurité' },
  { stable_key: 'futur', title: 'À venir', legacy_value: 'futur' },
];

async function main() {
  const { faqs } = await import('../src/data/faqs.ts');

  console.log(`${apply ? 'APPLYING' : 'DRY RUN (pass --apply to write)'} — ${CATEGORY_DEFS.length} categories, ${faqs.length} faqs`);

  faqs.forEach((f, i) => console.log(`  faq-${i} [${f.category}] — ${f.question.slice(0, 50)}...`));

  if (!apply) { console.log('\nNo changes written. Re-run with --apply.'); return; }

  const env = loadEnv();
  const admin = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: frLocale } = await admin.from('locales').select('id').eq('code', 'fr-CA').single();
  if (!frLocale) { console.error('fr-CA locale not found'); process.exit(1); }

  const categoryIdByLegacyValue = {};
  for (let i = 0; i < CATEGORY_DEFS.length; i++) {
    const c = CATEGORY_DEFS[i];
    const { data: cat, error: cErr } = await admin
      .from('faq_categories')
      .upsert({ stable_key: c.stable_key, visible: true, sort_order: i }, { onConflict: 'stable_key' })
      .select('id').single();
    if (cErr) { console.error(`category ${c.stable_key} failed:`, cErr.message); continue; }

    const { error: ctErr } = await admin
      .from('faq_category_translations')
      .upsert({ category_id: cat.id, locale_id: frLocale.id, title: c.title }, { onConflict: 'category_id,locale_id' });
    if (ctErr) { console.error(`category translation ${c.stable_key} failed:`, ctErr.message); continue; }

    categoryIdByLegacyValue[c.legacy_value] = cat.id;
    console.log(`OK category: ${c.stable_key}`);
  }

  for (let i = 0; i < faqs.length; i++) {
    const f = faqs[i];
    const categoryId = categoryIdByLegacyValue[f.category] ?? null;
    const stableKey = `faq-${i}`;

    const { data: faq, error: fErr } = await admin
      .from('faqs')
      .upsert({ stable_key: stableKey, category_id: categoryId, visible: true, sort_order: i, status: 'published' }, { onConflict: 'stable_key' })
      .select('id').single();
    if (fErr) { console.error(`faq ${stableKey} failed:`, fErr.message); continue; }

    const { error: ftErr } = await admin
      .from('faq_translations')
      .upsert({ faq_id: faq.id, locale_id: frLocale.id, question: f.question, answer: f.answer }, { onConflict: 'faq_id,locale_id' });
    if (ftErr) { console.error(`faq_translations ${stableKey} failed:`, ftErr.message); continue; }

    console.log(`OK: ${stableKey}`);
  }

  console.log('\nSeed complete.');
}

main().catch((err) => { console.error(err); process.exit(1); });
