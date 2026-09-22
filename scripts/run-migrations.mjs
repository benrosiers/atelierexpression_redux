// Applies supabase/migrations/*.sql in filename order against the project's
// Postgres database. Local/CI use only — reads DB credentials from .env,
// never the browser-facing PUBLIC_ vars. Each file runs in its own
// transaction so a failure stops cleanly at that file, not mid-file.
//
// Usage: node scripts/run-migrations.mjs

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Client } from 'pg';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function loadEnv() {
  const envPath = path.join(rootDir, '.env');
  const text = readFileSync(envPath, 'utf-8');
  const env = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    env[key] = value;
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const required = ['SUPABASE_DB_HOST', 'SUPABASE_DB_PORT', 'SUPABASE_DB_NAME', 'SUPABASE_DB_USER', 'SUPABASE_DB_PASSWORD'];
  const missing = required.filter((k) => !env[k]);
  if (missing.length > 0) {
    console.error(`Missing required .env keys: ${missing.join(', ')}`);
    process.exit(1);
  }

  const client = new Client({
    host: env.SUPABASE_DB_HOST,
    port: Number(env.SUPABASE_DB_PORT),
    database: env.SUPABASE_DB_NAME,
    user: env.SUPABASE_DB_USER,
    password: env.SUPABASE_DB_PASSWORD,
    ssl: { rejectUnauthorized: false }, // Supabase requires TLS; self-signed chain is expected here
  });

  console.log(`Connecting to ${env.SUPABASE_DB_HOST}...`);
  await client.connect();
  console.log('Connected.');

  const migrationsDir = path.join(rootDir, 'supabase', 'migrations');
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  console.log(`Found ${files.length} migration file(s): ${files.join(', ')}`);

  for (const file of files) {
    const sql = readFileSync(path.join(migrationsDir, file), 'utf-8');
    console.log(`\n--- Applying ${file} ---`);
    try {
      await client.query('begin');
      await client.query(sql);
      await client.query('commit');
      console.log(`OK: ${file}`);
    } catch (err) {
      await client.query('rollback');
      console.error(`FAILED: ${file}`);
      console.error(err.message);
      await client.end();
      process.exit(1);
    }
  }

  console.log('\nAll migrations applied successfully.');

  // Quick verification: list the tables we expect to exist.
  const { rows } = await client.query(`
    select table_name from information_schema.tables
    where table_schema = 'public'
    order by table_name
  `);
  console.log(`\nTables now in public schema (${rows.length}):`);
  rows.forEach((r) => console.log(`  - ${r.table_name}`));

  await client.end();
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
