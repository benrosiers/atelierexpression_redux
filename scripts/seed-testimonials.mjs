// Phase 3 continued: migrates src/data/testimonials.ts (the 3 fictional
// placeholder testimonials) into `testimonials` + `testimonial_translations`.
// Idempotent (upsert by stable_key). Never touches testimonials.ts — public
// cutover is a separate step, same as workshops.
//
// is_placeholder=true is carried through deliberately: these are NOT real
// participant feedback yet (no workshop has run), and must never render
// indistinguishably from a real testimonial once real ones start arriving.
//
// Usage: node scripts/seed-testimonials.mjs --apply

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

async function main() {
  const { testimonials } = await import('../src/data/testimonials.ts');

  console.log(`${apply ? 'APPLYING' : 'DRY RUN (pass --apply to write)'} — ${testimonials.length} testimonials`);

  const parsed = testimonials.map((t, i) => ({
    stable_key: `testimonial-${i}`,
    author_initials: t.name,
    is_placeholder: t.isPlaceholder,
    quote: t.quote,
    author_role: t.detail,
  }));

  parsed.forEach((p) => console.log(`  ${p.stable_key} — ${p.author_initials} — is_placeholder=${p.is_placeholder}`));

  if (!apply) { console.log('\nNo changes written. Re-run with --apply.'); return; }

  const env = loadEnv();
  const admin = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: frLocale } = await admin.from('locales').select('id').eq('code', 'fr-CA').single();
  if (!frLocale) { console.error('fr-CA locale not found'); process.exit(1); }

  for (let i = 0; i < parsed.length; i++) {
    const p = parsed[i];
    const { data: testimonial, error: tErr } = await admin
      .from('testimonials')
      .upsert({
        stable_key: p.stable_key, status: 'published', visible: true, featured: false,
        is_placeholder: p.is_placeholder, author_initials: p.author_initials, sort_order: i,
      }, { onConflict: 'stable_key' })
      .select('id').single();
    if (tErr) { console.error(`testimonial ${p.stable_key} failed:`, tErr.message); continue; }

    const { error: trErr } = await admin
      .from('testimonial_translations')
      .upsert({
        testimonial_id: testimonial.id, locale_id: frLocale.id,
        quote: p.quote, author_role: p.author_role,
      }, { onConflict: 'testimonial_id,locale_id' });
    if (trErr) { console.error(`testimonial_translations ${p.stable_key} failed:`, trErr.message); continue; }

    console.log(`OK: ${p.stable_key}`);
  }

  console.log('\nSeed complete.');
}

main().catch((err) => { console.error(err); process.exit(1); });
