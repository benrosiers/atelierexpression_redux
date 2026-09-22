// Phase 3: migrates src/data/offers.ts (the real workshop catalogue) into
// `workshops` + `workshop_translations`. Idempotent (upsert by slug).
// Never deletes/touches offers.ts — public site cutover for this page is a
// separate, later step (mirrors how hero/pillars were done: migrate first,
// prove the data, cut over the render only after that's verified).
//
// Usage: node scripts/seed-workshops.mjs --apply

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

// "2 heures" -> 120. Only pattern actually present in the real data; a
// value that doesn't match is left null rather than guessed.
function parseDurationMinutes(text) {
  const m = text.match(/(\d+)\s*heure/i);
  return m ? Number(m[1]) * 60 : null;
}

// "10 à 15 personnes" -> {min:10, max:15}. "6 à 10 personnes" -> {min:6, max:10}.
function parseCapacity(text) {
  const m = text.match(/(\d+)\s*à\s*(\d+)/);
  return m ? { min: Number(m[1]), max: Number(m[2]) } : { min: null, max: null };
}

// "45 $ CA" -> 4500. "À venir" -> null (price genuinely not set yet).
function parsePriceCents(text) {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*\$/);
  return m ? Math.round(parseFloat(m[1].replace(',', '.')) * 100) : null;
}

async function main() {
  const { offers } = await import('../src/data/offers.ts');

  console.log(`${apply ? 'APPLYING' : 'DRY RUN (pass --apply to write)'} — ${offers.length} workshops`);

  const parsed = offers.map((o) => ({
    slug: o.id,
    status: 'published',
    visible: true,
    featured: o.status === 'active',
    coming_soon: o.status !== 'active',
    price_cents: parsePriceCents(o.price),
    duration_minutes: parseDurationMinutes(o.duration),
    capacity: parseCapacity(o.groupSize),
    location: o.location,
    icon_glyph: o.icon,
    visual_variant: o.accentColor,
    title: o.title,
    tagline: o.subtitle,
    description: o.description,
    audience: o.level,
  }));

  parsed.forEach((p) => console.log(`  ${p.slug} — featured=${p.featured} coming_soon=${p.coming_soon} price_cents=${p.price_cents} duration_min=${p.duration_minutes} capacity=${p.capacity.min}-${p.capacity.max}`));

  if (!apply) { console.log('\nNo changes written. Re-run with --apply.'); return; }

  const env = loadEnv();
  const admin = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: frLocale } = await admin.from('locales').select('id').eq('code', 'fr-CA').single();
  if (!frLocale) { console.error('fr-CA locale not found'); process.exit(1); }

  for (let i = 0; i < parsed.length; i++) {
    const p = parsed[i];
    const { data: workshop, error: wErr } = await admin
      .from('workshops')
      .upsert({
        slug: p.slug, status: p.status, visible: p.visible, featured: p.featured,
        coming_soon: p.coming_soon, price_cents: p.price_cents, currency: 'CAD',
        duration_minutes: p.duration_minutes, capacity_min: p.capacity.min, capacity_max: p.capacity.max,
        location: p.location, icon_glyph: p.icon_glyph, visual_variant: p.visual_variant, sort_order: i,
      }, { onConflict: 'slug' })
      .select('id').single();
    if (wErr) { console.error(`workshop ${p.slug} failed:`, wErr.message); continue; }

    const { error: tErr } = await admin
      .from('workshop_translations')
      .upsert({
        workshop_id: workshop.id, locale_id: frLocale.id,
        title: p.title, tagline: p.tagline, description: p.description, audience: p.audience,
      }, { onConflict: 'workshop_id,locale_id' });
    if (tErr) { console.error(`workshop_translations ${p.slug} failed:`, tErr.message); continue; }

    console.log(`OK: ${p.slug}`);
  }

  console.log('\nSeed complete.');
}

main().catch((err) => { console.error(err); process.exit(1); });
