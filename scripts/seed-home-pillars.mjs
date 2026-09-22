// Phase 2B proof-of-pipeline seed: creates ONE real page ("home") with ONE
// real section (the homepage pillars) and its 6 real content_items, using
// the actual text from src/components/ValuePillars.astro (not invented
// placeholder data). This is deliberately narrow in scope — it exists to
// prove the pages -> sections -> content_items -> translations chain works
// end-to-end against real content, not to seed the whole site (that's
// later Phase 2B/3 work, tracked in docs/admin/content-inventory.md).
//
// Idempotent: upserts by (slug) / (page_id, stable_key) / (section_id,
// stable_key) — safe to re-run.
//
// Usage: node scripts/seed-home-pillars.mjs [--apply]

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

// Real content, copied from src/components/ValuePillars.astro — not invented.
const pillars = [
  { key: 'rire', icon: 'smile', variant: 'orange', title: 'Rire', description: 'Le rire comme premier outil. Pas le rire performé — le rire qui sort tout seul, maladroit et vrai.' },
  { key: 'jeu', icon: 'sparkle', variant: 'pink', title: 'Jeu', description: 'Les exercices sont simples et accessibles. On joue. On essaie. On recommence. Sans score.' },
  { key: 'corps', icon: 'dancer', variant: 'coral', title: 'Corps', description: "L'expression passe par le corps. On bouge un peu. Rien d'athlétique. Juste réhabiter sa propre peau." },
  { key: 'voix', icon: 'speechBubble', variant: 'peach', title: 'Voix', description: 'Parler, tonner, chuchoter, faire du bruit. Retrouver le droit d\'exister avec sa voix.' },
  { key: 'presence', icon: 'sun', variant: 'orange', title: 'Présence', description: 'Être là, pleinement. Pas dans sa tête, pas dans ses inquiétudes. Juste là, avec les autres.' },
  { key: 'cercle', icon: 'spiral', variant: 'pink', title: 'Cercle', description: 'Chaque atelier finit par un cercle de partage. Court, libre, sans pression. Tu peux juste écouter.' },
];

async function main() {
  console.log(`${apply ? 'APPLYING' : 'DRY RUN (pass --apply to write)'}\n`);
  console.log('Would create/update:');
  console.log('  pages: slug=home');
  console.log('  sections: stable_key=pillars (component_type=pillars)');
  pillars.forEach((p, i) => console.log(`  content_items[${i}]: stable_key=${p.key} — "${p.title}"`));

  if (!apply) {
    console.log('\nNo changes written. Re-run with --apply to seed for real.');
    return;
  }

  const env = loadEnv();
  const admin = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: locale, error: localeErr } = await admin
    .from('locales').select('id').eq('code', 'fr-CA').single();
  if (localeErr || !locale) { console.error('fr-CA locale not found:', localeErr?.message); process.exit(1); }

  const { data: page, error: pageErr } = await admin
    .from('pages')
    .upsert({ slug: 'home', page_type: 'standard', status: 'published', visible: true, sort_order: 0 }, { onConflict: 'slug' })
    .select('id')
    .single();
  if (pageErr || !page) { console.error('page upsert failed:', pageErr?.message); process.exit(1); }
  console.log(`\nOK: page "home" (id: ${page.id})`);

  const { data: pageTranslation, error: ptErr } = await admin
    .from('page_translations')
    .upsert({
      page_id: page.id, locale_id: locale.id,
      title: 'Accueil', navigation_label: 'Accueil',
      seo_title: 'Atelier Expression | Des ateliers joyeux pour adultes',
      seo_description: 'Des ateliers joyeux pour adultes qui veulent se sentir plus vivants. Petit groupe, grande permission. Aucun talent requis.',
    }, { onConflict: 'page_id,locale_id' });
  if (ptErr) { console.error('page_translations upsert failed:', ptErr.message); process.exit(1); }
  console.log('OK: page_translations (fr-CA)');

  const { data: section, error: sectionErr } = await admin
    .from('sections')
    .upsert({ page_id: page.id, stable_key: 'pillars', component_type: 'pillars', visible: true, sort_order: 3 }, { onConflict: 'page_id,stable_key' })
    .select('id')
    .single();
  if (sectionErr || !section) { console.error('section upsert failed:', sectionErr?.message); process.exit(1); }
  console.log(`OK: section "pillars" (id: ${section.id})`);

  for (let i = 0; i < pillars.length; i++) {
    const p = pillars[i];
    const { data: item, error: itemErr } = await admin
      .from('content_items')
      .upsert({
        section_id: section.id, item_type: 'pillar', stable_key: p.key,
        visual_variant: p.variant, icon_key: p.icon, visible: true, sort_order: i, status: 'published',
      }, { onConflict: 'section_id,stable_key' })
      .select('id')
      .single();
    if (itemErr || !item) { console.error(`content_item ${p.key} failed:`, itemErr?.message); process.exit(1); }

    const { error: citErr } = await admin
      .from('content_item_translations')
      .upsert({ content_item_id: item.id, locale_id: locale.id, title: p.title, body: p.description }, { onConflict: 'content_item_id,locale_id' });
    if (citErr) { console.error(`content_item_translations ${p.key} failed:`, citErr.message); process.exit(1); }

    console.log(`OK: content_item "${p.key}" + translation`);
  }

  console.log('\nSeed complete.');
}

main().catch((err) => { console.error('Unexpected error:', err); process.exit(1); });
