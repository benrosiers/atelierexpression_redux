// Migrates src/data/nextWorkshop.ts — the site's single source of truth for
// the next workshop's real-world scheduling state — into `next_workshop` +
// `next_workshop_translations`. Idempotent (upsert by stable_key). Never
// touches nextWorkshop.ts — public cutover is a separate step, same as
// every other Phase 3 migration.
//
// workshopStatusCopy (the 5 fixed status->badge/note strings) is
// deliberately NOT migrated — see the comment in supabase/migrations/0010.
//
// Usage: node scripts/seed-next-workshop.mjs --apply

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

// "45 $ CA" -> 4500. Same pattern as seed-workshops.mjs.
function parsePriceCents(text) {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*\$/);
  return m ? Math.round(parseFloat(m[1].replace(',', '.')) * 100) : null;
}

async function main() {
  const { nextWorkshop } = await import('../src/data/nextWorkshop.ts');

  console.log(`${apply ? 'APPLYING' : 'DRY RUN (pass --apply to write)'} — next_workshop singleton`);

  const parsed = {
    status: nextWorkshop.status,
    event_date: nextWorkshop.date, // null today — real ISO date once a date is announced
    event_time: nextWorkshop.time,
    location: nextWorkshop.location,
    capacity: nextWorkshop.capacity,
    price_cents: parsePriceCents(nextWorkshop.price),
    registration_url: nextWorkshop.registrationUrl,
    interest_form_url: nextWorkshop.interestFormUrl,
    short_description: nextWorkshop.shortDescription,
    details: nextWorkshop.details,
    cta_label: nextWorkshop.ctaLabel,
  };

  console.log(`  status=${parsed.status} date=${parsed.event_date} price_cents=${parsed.price_cents} capacity="${parsed.capacity}"`);

  if (!apply) { console.log('\nNo changes written. Re-run with --apply.'); return; }

  const env = loadEnv();
  const admin = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: frLocale } = await admin.from('locales').select('id').eq('code', 'fr-CA').single();
  if (!frLocale) { console.error('fr-CA locale not found'); process.exit(1); }

  const { data: row, error: rowErr } = await admin
    .from('next_workshop')
    .upsert({
      stable_key: 'next-workshop', status: parsed.status, event_date: parsed.event_date,
      event_time: parsed.event_time, location: parsed.location, capacity: parsed.capacity,
      price_cents: parsed.price_cents, registration_url: parsed.registration_url,
      interest_form_url: parsed.interest_form_url,
    }, { onConflict: 'stable_key' })
    .select('id').single();
  if (rowErr) { console.error('next_workshop upsert failed:', rowErr.message); process.exit(1); }

  const { error: trErr } = await admin
    .from('next_workshop_translations')
    .upsert({
      next_workshop_id: row.id, locale_id: frLocale.id,
      short_description: parsed.short_description, details: parsed.details, cta_label: parsed.cta_label,
    }, { onConflict: 'next_workshop_id,locale_id' });
  if (trErr) { console.error('next_workshop_translations upsert failed:', trErr.message); process.exit(1); }

  console.log('OK: next-workshop\n\nSeed complete.');
}

main().catch((err) => { console.error(err); process.exit(1); });
