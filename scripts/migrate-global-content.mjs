// Phase 2A — migrates the truly global, non-repeatable config from
// src/data/site.ts + src/data/navigation.ts into `site_settings`. Idempotent
// (upsert by key — safe to re-run). Does NOT touch or remove the static
// files; the public site keeps reading them directly until each page is
// switched over and visually re-verified (see docs/CMS_MIGRATION_PLAN.md).
//
// Usage: node scripts/migrate-global-content.mjs [--apply]
// Without --apply: prints what would be written, writes nothing.

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
  const { site } = await import('../src/data/site.ts');
  const { mainNav, footerNav, ctaNav } = await import('../src/data/navigation.ts');

  const entries = [
    ['site_identity', {
      name: site.name, domain: site.domain, url: site.url,
      tagline: site.tagline, description: site.description,
    }],
    ['contact', { email: site.email, location: site.location }],
    ['social', { instagram: site.instagram, facebook: site.facebook }],
    ['seo_defaults', { ogImage: site.og.image, ogLocale: site.og.locale }],
    ['navigation_main', mainNav],
    ['navigation_footer', footerNav],
    // Static snapshot only — the real label is workshop-status-dependent
    // (see the type comment in src/lib/content/siteSettings.ts).
    ['cta_global', { label: ctaNav.label, href: ctaNav.href }],
    ['newsletter', { enabled: true }],
  ];

  console.log(`${apply ? 'APPLYING' : 'DRY RUN (pass --apply to write)'} — ${entries.length} site_settings keys:\n`);
  entries.forEach(([key, value]) => {
    console.log(`  ${key}:`, JSON.stringify(value).slice(0, 140));
  });

  if (!apply) {
    console.log('\nNo changes written. Re-run with --apply to migrate for real.');
    return;
  }

  const env = loadEnv();
  const admin = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let okCount = 0;
  for (const [key, value] of entries) {
    const { error } = await admin
      .from('site_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) {
      console.error(`FAILED: ${key} — ${error.message}`);
    } else {
      okCount += 1;
      console.log(`OK: ${key}`);
    }
  }

  console.log(`\n${okCount}/${entries.length} keys written successfully.`);
}

main().catch((err) => { console.error('Unexpected error:', err); process.exit(1); });
