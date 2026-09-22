// One-off verification: confirms locales were seeded and RLS is enabled
// everywhere it should be. Not part of the regular migration flow.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Client } from 'pg';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

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
  const env = loadEnv();
  const client = new Client({
    host: env.SUPABASE_DB_HOST,
    port: Number(env.SUPABASE_DB_PORT),
    database: env.SUPABASE_DB_NAME,
    user: env.SUPABASE_DB_USER,
    password: env.SUPABASE_DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const locales = await client.query('select code, label, enabled, is_default from locales order by sort_order');
  console.log('locales:', locales.rows);

  const rls = await client.query(`
    select relname, relrowsecurity
    from pg_class
    where relnamespace = 'public'::regnamespace and relkind = 'r'
    order by relname
  `);
  const withoutRls = rls.rows.filter((r) => !r.relrowsecurity);
  console.log(`\nTables with RLS enabled: ${rls.rows.length - withoutRls.length}/${rls.rows.length}`);
  if (withoutRls.length > 0) {
    console.log('Tables WITHOUT RLS (unexpected):', withoutRls.map((r) => r.relname));
  }

  const policyCount = await client.query(`select count(*)::int as n from pg_policies where schemaname = 'public'`);
  console.log('Total policies created:', policyCount.rows[0].n);

  await client.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
