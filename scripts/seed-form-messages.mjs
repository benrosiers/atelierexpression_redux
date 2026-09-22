// Migrates the pure-text, non-interpolated parts of the 4 forms' copy
// (InterestForm, ReservationForm, NewsletterSignup, contact.astro) into a
// single site_settings.form_messages entry. Error and "not configured"
// messages embed a mailto link (JSX) and are deliberately left as
// hardcoded component markup — see the comment on
// SiteSettingsMap.form_messages in src/lib/content/siteSettings.ts.
//
// Content hand-transcribed verbatim from each component's current markup.
// Note: loadingLabel genuinely differs per form (NewsletterSignup uses
// "…", the other three use "Envoi en cours…") — not collapsed into one
// shared field.
//
// Usage: node scripts/seed-form-messages.mjs --apply

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

const VALUE = {
  interest: {
    submitLabel: 'Être averti·e du prochain atelier',
    loadingLabel: 'Envoi en cours…',
    successMessage: 'C\'est noté! Tu seras parmi les premières personnes averties de la date.',
  },
  reservation: {
    submitLabel: 'Confirmer ma réservation',
    loadingLabel: 'Envoi en cours…',
    successTitle: 'Demande reçue!',
    successBody: 'Nous te confirmons ta place par courriel dans les 24 heures. On a hâte de rire avec toi.',
  },
  newsletter: {
    submitLabel: 'Je m\'inscris',
    loadingLabel: '…',
    successMessage: '✓ Merci! Tu seras la première personne informée des nouveaux ateliers.',
  },
  contact: {
    submitLabel: 'Envoyer mon message',
    loadingLabel: 'Envoi en cours…',
    successMessage: 'Message reçu! On te répond dans les 24 à 48 heures.',
  },
};

async function main() {
  console.log(`${apply ? 'APPLYING' : 'DRY RUN (pass --apply to write)'} — site_settings.form_messages (4 forms)`);
  console.log(JSON.stringify(VALUE, null, 2));

  if (!apply) { console.log('\nNo changes written. Re-run with --apply.'); return; }

  const env = loadEnv();
  const admin = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await admin
    .from('site_settings')
    .upsert({ key: 'form_messages', value: VALUE, updated_at: new Date().toISOString() }, { onConflict: 'key' });

  if (error) { console.error('form_messages failed:', error.message); process.exit(1); }
  console.log('OK: form_messages');
}

main().catch((err) => { console.error(err); process.exit(1); });
