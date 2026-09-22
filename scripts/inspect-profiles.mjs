// One-off audit: exact live schema + RLS policies for `profiles`, and a
// row count (no row content printed — could contain real emails).
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

  const cols = await client.query(`
    select column_name, data_type, is_nullable, column_default
    from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
    order by ordinal_position
  `);
  console.log('profiles columns:');
  cols.rows.forEach((r) => console.log(`  ${r.column_name} — ${r.data_type}, nullable=${r.is_nullable}, default=${r.column_default ?? 'none'}`));

  const policies = await client.query(`
    select policyname, cmd, permissive, roles
    from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
    order by policyname
  `);
  console.log('\nprofiles RLS policies:');
  policies.rows.forEach((r) => console.log(`  ${r.policyname} — cmd=${r.cmd}`));

  const count = await client.query('select count(*)::int as n from profiles');
  console.log(`\nprofiles row count: ${count.rows[0].n}`);

  const authCount = await client.query('select count(*)::int as n from auth.users');
  console.log(`auth.users row count: ${authCount.rows[0].n}`);

  await client.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
