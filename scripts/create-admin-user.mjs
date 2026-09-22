// Creates (or finds) the first real /admin user: a Supabase Auth user +
// a matching public.profiles row with role = 'admin'. Idempotent — safe to
// re-run with the same email.
//
// Passwordless by design: the admin UI's primary sign-in method is a magic
// link (see src/pages/admin/login.astro), so this script creates the auth
// user WITHOUT a password at all. There is nothing to leak, log, or commit,
// because no password exists — the brief's own stated preference ("préférer
// une connexion par magic link") is satisfied by construction, not by
// choosing the "careful password handling" branch of the spec.
//
// Usage:
//   node scripts/create-admin-user.mjs someone@example.com
//   node scripts/create-admin-user.mjs               (prompts interactively)
//
// Reads SUPABASE_SERVICE_ROLE_KEY + PUBLIC_SUPABASE_URL from .env. Never
// prints the service_role key. Never accepts or prints a password.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import readline from 'node:readline';
import { createClient } from '@supabase/supabase-js';

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

function promptEmail() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Adresse courriel administrative (Cindy) : ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function main() {
  const env = loadEnv();
  if (!env.PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  let email = process.argv[2];
  if (!email) {
    email = await promptEmail();
  }

  if (!email || !isValidEmail(email)) {
    console.error('No valid email provided. Aborting — refusing to guess or invent one.');
    process.exit(1);
  }

  // service_role client — bypasses RLS, admin.* API access. Never exported,
  // never imported outside this script.
  const admin = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Find an existing auth user by email first (idempotency) — listUsers()
  // paginates; a single admin account will always be on page 1, but we
  // page through defensively in case other users get added later.
  let existingUser = null;
  let page = 1;
  while (!existingUser) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      console.error('Failed to list existing users:', error.message);
      process.exit(1);
    }
    existingUser = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
    if (data.users.length < 200) break; // last page
    page += 1;
  }

  let userId;
  if (existingUser) {
    userId = existingUser.id;
    console.log(`Found existing auth user for ${email} (id: ${userId}).`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true, // no email verification step needed — this is a
                            // trusted admin account we're creating directly
      // No password field — passwordless account, magic link only.
    });
    if (error) {
      console.error('Failed to create auth user:', error.message);
      process.exit(1);
    }
    userId = data.user.id;
    console.log(`Created new auth user for ${email} (id: ${userId}).`);
  }

  // Upsert the profiles row — service_role bypasses RLS, so this works
  // regardless of the "self read own profile" / "admin manage profiles"
  // policies (which only govern client-side access).
  const { error: upsertError } = await admin
    .from('profiles')
    .upsert(
      { id: userId, email, role: 'admin' },
      { onConflict: 'id' },
    );

  if (upsertError) {
    console.error('Failed to upsert profiles row:', upsertError.message);
    process.exit(1);
  }

  console.log(`profiles row set: role=admin for ${email}.`);
  console.log('\nDone. Sign in at /admin/login using "Lien magique" with this address.');
}

main().catch((err) => {
  console.error('Unexpected error:', err.message);
  process.exit(1);
});
