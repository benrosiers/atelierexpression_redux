// Migrates the last 2 inline collections on the homepage found while
// reviewing index.astro during the seed-inline-pages.mjs pass: the
// "express-grid" (12 word+doodle items — the original inventory's
// "expression pastilles") and "forwhom-cards" (6 icon+text items under
// "Tu n'as pas besoin d'être à l'aise pour commencer"). Content
// hand-transcribed verbatim from src/pages/index.astro.
//
// Adds two new sections under the existing 'home' page (hero + pillars
// already exist there from the earlier migration). Idempotent (upsert by
// section stable_key / item stable_key). Never touches index.astro.
//
// Usage: node scripts/seed-home-express-forwhom.mjs --apply

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

const SECTIONS = [
  {
    stable_key: 'express-grid', component_type: 'word-doodle-grid',
    items: [
      { icon: 'speechBubble', body: 'Parler' },
      { icon: 'pencil', body: 'Écrire' },
      { icon: 'dancer', body: 'Bouger' },
      { icon: 'palette', body: 'Créer' },
      { icon: 'notes', body: 'Chanter' },
      { icon: 'smile', body: 'Rire' },
      { icon: 'airWaves', body: 'Respirer' },
      { icon: 'hand', body: 'Poser une limite' },
      { icon: 'non', body: 'Dire non' },
      { icon: 'oui', body: 'Dire oui' },
      { icon: 'star', body: 'Exister' },
      { icon: 'sun', body: 'Prendre ta place' },
    ],
  },
  {
    stable_key: 'forwhom-cards', component_type: 'icon-text-card-grid',
    items: [
      { icon: 'heart', body: 'Tu te sens coupé·e de toi-même et tu cherches une façon de te reconnecter.' },
      { icon: 'star', body: "Tu as toujours eu envie d'essayer quelque chose comme ça, mais tu n'as jamais osé." },
      { icon: 'speechBubble', body: "Tu aimerais t'exprimer plus librement — ta voix, ton corps, tes idées, tes émotions." },
      { icon: 'smile', body: "Tu as l'impression d'avoir perdu quelque chose : ta légèreté, ton élan, ta spontanéité." },
      { icon: 'leaf', body: 'Tu veux grandir, mais avec du jeu, de la chaleur, et des gens vrais — pas des méthodes sérieuses.' },
      { icon: 'hand', body: "Tu as besoin d'un espace où exister sans te rétrécir. Où essayer sans être jugé·e." },
    ],
  },
];

async function main() {
  const totalItems = SECTIONS.reduce((sum, s) => sum + s.items.length, 0);
  console.log(`${apply ? 'APPLYING' : 'DRY RUN (pass --apply to write)'} — 2 sections, ${totalItems} items (page: home)`);
  SECTIONS.forEach((s) => console.log(`  ${s.stable_key} (${s.items.length})`));

  if (!apply) { console.log('\nNo changes written. Re-run with --apply.'); return; }

  const env = loadEnv();
  const admin = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: frLocale } = await admin.from('locales').select('id').eq('code', 'fr-CA').single();
  if (!frLocale) { console.error('fr-CA locale not found'); process.exit(1); }

  const { data: homePage, error: pageErr } = await admin.from('pages').select('id').eq('slug', 'home').single();
  if (pageErr || !homePage) { console.error('home page not found — run scripts/seed-home-pillars.mjs first'); process.exit(1); }

  // Existing sections on 'home' are hero (0) and pillars (1) — start these after.
  const { count: existingSectionCount } = await admin.from('sections').select('id', { count: 'exact', head: true }).eq('page_id', homePage.id);
  let sortOrderBase = existingSectionCount ?? 2;

  for (const section of SECTIONS) {
    const { data: sectionRow, error: sectionErr } = await admin
      .from('sections')
      .upsert(
        { page_id: homePage.id, stable_key: section.stable_key, component_type: section.component_type, visible: true, sort_order: sortOrderBase },
        { onConflict: 'page_id,stable_key' },
      )
      .select('id').single();
    if (sectionErr) { console.error(`section ${section.stable_key} failed:`, sectionErr.message); continue; }
    sortOrderBase++;

    for (let itemIndex = 0; itemIndex < section.items.length; itemIndex++) {
      const item = section.items[itemIndex];
      const stableKey = `${section.stable_key}-${itemIndex}`;

      const { data: itemRow, error: itemErr } = await admin
        .from('content_items')
        .upsert(
          { section_id: sectionRow.id, item_type: section.component_type, stable_key: stableKey, icon_key: item.icon, visible: true, sort_order: itemIndex, status: 'published' },
          { onConflict: 'section_id,stable_key' },
        )
        .select('id').single();
      if (itemErr) { console.error(`content_item ${section.stable_key}/${stableKey} failed:`, itemErr.message); continue; }

      const { error: itemTrErr } = await admin
        .from('content_item_translations')
        .upsert(
          { content_item_id: itemRow.id, locale_id: frLocale.id, body: item.body },
          { onConflict: 'content_item_id,locale_id' },
        );
      if (itemTrErr) { console.error(`content_item_translations ${section.stable_key}/${stableKey} failed:`, itemTrErr.message); continue; }
    }
    console.log(`OK section: ${section.stable_key} (${section.items.length} items)`);
  }

  console.log('\nSeed complete.');
}

main().catch((err) => { console.error(err); process.exit(1); });
