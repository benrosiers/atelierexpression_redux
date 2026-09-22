// Migrates per-page SEO title + meta description into
// page_translations.seo_title/seo_description (fr-CA only), for the 11
// pages whose BaseLayout title/description are static (reserver.astro is
// deliberately excluded — its title/description are computed at render
// time from nextWorkshop.status, and a static CMS override there would
// fight the site-wide status-gating logic).
//
// 5 of these pages (home, a-propos, parcours, ateliers, evenements) already
// have a `pages` row from earlier migrations — this only adds seo_title/
// seo_description to their existing page_translations row (upsert touches
// only the columns passed, so existing `title` is untouched). The other 6
// (faq, temoignages, contact, communaute, ressources, mentions-legales)
// get a new `pages` row, same shape/convention as seed-inline-pages.mjs.
//
// Content hand-transcribed verbatim from each page's current
// <BaseLayout title=... description=...> props.
//
// Usage: node scripts/seed-page-seo.mjs --apply

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

// sort_order continues after the existing 5 pages (home=1..evenements=5,
// from seed-inline-pages.mjs) for the 6 new ones.
const PAGES = [
  { slug: 'home', title: 'Accueil', seo_title: 'Accueil', seo_description: "Atelier Expression — Des ateliers joyeux pour adultes qui veulent se sentir plus vivants. Expression, voix, mouvement, rire. À Longueuil, Rive-Sud de Montréal." },
  { slug: 'a-propos', title: 'À propos', seo_title: 'À propos', seo_description: "Cindy — facilitatrice, animatrice, et transmettrice d'Atelier Expression. Sa conviction : l'humain n'a jamais été créé pour se contenir en permanence." },
  { slug: 'parcours', title: 'Parcours', seo_title: 'Parcours', seo_description: "Parcours de transformation en 4 à 6 semaines — expression, voix, mouvement, confiance, et sécurité de groupe. Bientôt disponible à Atelier Expression." },
  { slug: 'ateliers', title: 'Les ateliers', seo_title: 'Les ateliers', seo_description: "Atelier découverte — 2 heures de jeu, de rire, de mouvement et d'expression. Pour adultes. Aucun talent requis. Aucune performance attendue. À Longueuil, Rive-Sud de Montréal." },
  { slug: 'evenements', title: 'Événements', seo_title: 'Événements', seo_description: "Ateliers, soirées thématiques, et événements spéciaux Atelier Expression. Dates à venir — inscris-toi à l'infolettre pour être informé·e en premier." },
  { slug: 'faq', title: 'Foire aux questions', seo_title: 'Foire aux questions', seo_description: "Toutes les réponses à tes questions sur les ateliers Atelier Expression. Gêne, performance, lieu, prix, format — on répond honnêtement.", isNew: true, sortOrder: 6 },
  { slug: 'temoignages', title: 'Témoignages', seo_title: 'Témoignages', seo_description: "Ce que les participant·es d'Atelier Expression ressentent. Témoignages à venir après les premiers ateliers.", isNew: true, sortOrder: 7 },
  { slug: 'contact', title: 'Contact', seo_title: 'Contact', seo_description: "Contacte Atelier Expression — questions, réservations groupes, ateliers privés ou corporatifs, et collaborations. On répond sous 24 à 48h.", isNew: true, sortOrder: 8 },
  { slug: 'communaute', title: 'La communauté', seo_title: 'La communauté', seo_description: "Rejoins la communauté Atelier Expression — infolettre, Instagram, Facebook. Des ateliers joyeux, une tribu bienveillante.", isNew: true, sortOrder: 9 },
  { slug: 'ressources', title: 'Ressources', seo_title: 'Ressources', seo_description: "Articles, réflexions et ressources sur l'expression, le rire, la présence, et la confiance. Par Atelier Expression.", isNew: true, sortOrder: 10 },
  { slug: 'mentions-legales', title: 'Mentions légales', seo_title: 'Mentions légales', seo_description: "Mentions légales et politique de confidentialité d'Atelier Expression.", isNew: true, sortOrder: 11 },
];

async function main() {
  console.log(`${apply ? 'APPLYING' : 'DRY RUN (pass --apply to write)'} — SEO for ${PAGES.length} pages (reserver.astro excluded — dynamic title)`);
  PAGES.forEach((p) => console.log(`  ${p.slug}${p.isNew ? ' (new page row)' : ''}`));

  if (!apply) { console.log('\nNo changes written. Re-run with --apply.'); return; }

  const env = loadEnv();
  const admin = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: frLocale } = await admin.from('locales').select('id').eq('code', 'fr-CA').single();
  if (!frLocale) { console.error('fr-CA locale not found'); process.exit(1); }

  for (const page of PAGES) {
    let pageId;
    if (page.isNew) {
      const { data: pageRow, error: pageErr } = await admin
        .from('pages')
        .upsert({ slug: page.slug, status: 'published', visible: true, sort_order: page.sortOrder }, { onConflict: 'slug' })
        .select('id').single();
      if (pageErr) { console.error(`page ${page.slug} failed:`, pageErr.message); continue; }
      pageId = pageRow.id;
    } else {
      const { data: pageRow, error: pageErr } = await admin.from('pages').select('id').eq('slug', page.slug).single();
      if (pageErr || !pageRow) { console.error(`page ${page.slug} not found — expected an existing row`); continue; }
      pageId = pageRow.id;
    }

    const translationFields = page.isNew
      ? { page_id: pageId, locale_id: frLocale.id, title: page.title, seo_title: page.seo_title, seo_description: page.seo_description }
      : { page_id: pageId, locale_id: frLocale.id, seo_title: page.seo_title, seo_description: page.seo_description };

    const { error: trErr } = await admin
      .from('page_translations')
      .upsert(translationFields, { onConflict: 'page_id,locale_id' });
    if (trErr) { console.error(`page_translations ${page.slug} failed:`, trErr.message); continue; }
    console.log(`OK: ${page.slug}`);
  }

  console.log('\nSeed complete.');
}

main().catch((err) => { console.error(err); process.exit(1); });
