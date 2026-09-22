// Migrates the inline .map()-rendered arrays hand-transcribed from
// src/pages/{a-propos,parcours,ateliers,evenements}.astro into
// pages/sections/content_items (fr-CA only). These are NOT in src/data/*.ts
// — they're literals inside the page components themselves, so unlike
// every other Phase 3 script this one can't `import()` the source; the
// content below is copied verbatim from each .astro file and must be kept
// in sync by hand if the static fallback ever changes.
//
// Includes 3 collections not in the original content inventory, found
// while reading these files for this pass: parcours' "reconnect-list"
// (before/after pairs), ateliers' "breakdown-list" (the 6-step workshop
// breakdown), and ateliers' "bring-list" (what to bring). All genuinely
// editorial, so migrated alongside the originally-inventoried ones.
//
// Idempotent (upsert by page slug / section stable_key / item stable_key).
// Never touches the .astro files — public cutover is a separate step.
//
// Usage: node scripts/seed-inline-pages.mjs --apply

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

// ── Page definitions ────────────────────────────────────────────────────
const PAGES = [
  {
    slug: 'a-propos', title: 'À propos',
    sections: [
      {
        stable_key: 'why-items', component_type: 'icon-text-grid',
        items: [
          { icon: '🌬️', body: "Un espace où il est permis de prendre de la place — pas de se retenir." },
          { icon: '😄', body: "Un rire vrai, pas le rire poli qu'on fait pour mettre les autres à l'aise." },
          { icon: '🤸', body: "Un corps qui bouge sans être jugé — pas parfaitement, mais librement." },
          { icon: '💬', body: "Une voix qu'on entend — même si elle tremble au début." },
          { icon: '🤝', body: "Un groupe qui devient ressource plutôt que source d'anxiété." },
          { icon: '✨', body: "La permission d'exister pleinement — sans performer, sans minimiser." },
        ],
      },
      {
        stable_key: 'values', component_type: 'icon-title-body-grid',
        items: [
          { icon: '🛡️', title: 'La sécurité avant tout', body: "Chaque atelier commence par la création d'un cadre bienveillant. On ne juge pas. On ne compare pas. On protège l'espace.", variant: 'orange' },
          { icon: '🎭', title: 'Le jeu, jamais la performance', body: "On joue. On essaie. On rate. On recommence. Il n'y a pas de bonne réponse, pas de mauvaise façon d'être là.", variant: 'pink' },
          { icon: '🤝', title: 'Le groupe comme ressource', body: "Ce n'est pas un cours magistral. C'est un cercle. Tout le monde apporte quelque chose. Tout le monde repart avec quelque chose.", variant: 'orange' },
          { icon: '🌱', title: 'Le rythme de chacun·e', body: 'Tu participes à ton rythme. Tu peux observer. Tu peux faire la moitié. Tu peux choisir d\'aller moins loin. C\'est ton espace.', variant: 'pink' },
          { icon: '😄', title: 'Le rire comme premier outil', body: "Pas le rire poli. Le vrai. Celui qui sort quand on s'y attend pas. C'est souvent lui qui ouvre la première porte.", variant: 'orange' },
          { icon: '🔄', title: 'Honnêteté sur ce qu\'on est', body: "Atelier Expression n'est pas une thérapie, ni un culte, ni du développement personnel sérieux. C'est un espace joyeux, humain, et concret.", variant: 'pink' },
        ],
      },
    ],
  },
  {
    slug: 'parcours', title: 'Parcours',
    sections: [
      {
        stable_key: 'modules', component_type: 'week-title-body-list',
        items: [
          { label: 'Semaine 1', title: 'Rire et lâcher-prise', body: "Briser la glace — vraiment. Le rire comme point d'entrée, pas comme objectif. Le corps commence à se rappeler qu'il peut bouger librement.", variant: 'orange' },
          { label: 'Semaine 2', title: 'Expression corporelle', body: "Retrouver son corps comme outil d'expression, pas comme source d'embarras ou d'auto-surveillance.", variant: 'pink' },
          { label: 'Semaine 3', title: 'Voix et présence', body: "La voix, le regard, le souffle. Occuper l'espace sans s'excuser d'être là. Parler sans rétrécir.", variant: 'peach' },
          { label: 'Semaine 4', title: 'Permission et confiance', body: "Oser parler, oser écouter, oser demander. Dire non. Dire oui. La confiance comme résultat — pas comme prérequis.", variant: 'orange' },
          { label: 'Semaine 5', title: 'Connexion et cercle', body: 'Le groupe comme ressource. Comment créer du lien pour de vrai, sans superficialité et sans fusion.', variant: 'pink' },
          { label: 'Semaine 6', title: 'Intégration et suite', body: "Qu'est-ce que tu gardes? Qu'est-ce qui change dans ta vie de tous les jours? Et maintenant, quoi?", variant: 'peach' },
        ],
      },
      {
        stable_key: 'reconnect-list', component_type: 'before-after-list',
        items: [
          { title: 'Se retenir', body: 'Respirer, ressentir, bouger' },
          { title: 'Se taire', body: 'Retrouver sa voix' },
          { title: 'Figer', body: "Rejoindre l'élan" },
          { title: 'Survivre', body: "S'exprimer pleinement" },
          { title: 'Rester petit·e', body: 'Prendre sa place, avec droit' },
        ],
      },
    ],
  },
  {
    slug: 'ateliers', title: 'Les ateliers',
    sections: [
      {
        stable_key: 'breakdown', component_type: 'numbered-step-list',
        items: [
          { label: '01', title: 'Accueil et sécurité', body: 'On pose le cadre ensemble. Un seul accord : ici, on ne juge pas. Ni les autres, ni soi-même.' },
          { label: '02', title: 'Jeux simples pour briser la glace', body: "Des jeux légers, accessibles, parfois absurdes. Le but n'est pas d'être bon·ne — c'est de commencer à bouger." },
          { label: '03', title: 'Rire et mouvement guidé', body: 'Du rire provoqué, du mouvement libre. Le corps se réveille. La gêne commence à se dissoudre.' },
          { label: '04', title: 'Voix, présence, mini-expressions', body: 'On utilise la voix. On occupe l\'espace. On essaie de petites choses sans pression et sans public qui évalue.' },
          { label: '05', title: 'Cercle de partage léger', body: "Un moment pour déposer ce qu'on a vécu. Court, libre, sans obligation. Tu peux juste écouter." },
          { label: '06', title: 'Retour au calme et prochaine invitation', body: "On revient ensemble. Et on parle de ce qui s'en vient." },
        ],
      },
      {
        stable_key: 'who-items', component_type: 'text-card-grid',
        items: [
          { body: "Tu te sens coupé·e de toi-même et tu veux retrouver quelque chose de vivant." },
          { body: "Tu n'as jamais osé essayer quelque chose comme ça — et tu en as envie depuis longtemps." },
          { body: 'Tu veux t\'exprimer plus librement : ta voix, ton corps, tes émotions.' },
          { body: "Tu as l'impression d'avoir perdu ta légèreté, ton élan, ta spontanéité." },
          { body: 'Tu as besoin d\'un espace sécurisé pour essayer sans te juger ni être jugé·e.' },
          { body: 'Tu veux du jeu, de la chaleur, et des gens vrais — pas une autre méthode sérieuse.' },
        ],
      },
      {
        stable_key: 'expect-yes', component_type: 'checklist',
        items: [
          { body: "Un accueil chaleureux, même si tu viens seul·e" },
          { body: 'Des jeux simples qui ne nécessitent aucun talent' },
          { body: 'Des rires — sincères, parfois maladroits, toujours vrais' },
          { body: 'Du mouvement, léger et guidé' },
          { body: 'Un cercle de partage court et sans obligation' },
          { body: 'Un espace pour exister sans te retenir' },
          { body: 'Des participant·es qui, toi aussi, ont hésité avant de venir' },
          { body: "L'envie de revenir" },
        ],
      },
      {
        stable_key: 'expect-no', component_type: 'checklist',
        items: [
          { body: "Un cours de comédie ou d'improvisation" },
          { body: 'Un cours de danse ou de mouvement artistique' },
          { body: 'Une thérapie ou un groupe de soutien psychologique' },
          { body: 'Une performance devant un public' },
          { body: 'Un espace compétitif ou évaluatif' },
          { body: 'Un atelier avec un résultat attendu' },
          { body: 'Un groupe de développement personnel avec grande promesse' },
        ],
      },
      {
        stable_key: 'bring-list', component_type: 'checklist',
        items: [
          { body: 'Des vêtements confortables dans lesquels tu peux bouger' },
          { body: "De l'eau" },
          { body: 'Ta curiosité — c\'est le seul bagage requis' },
          { body: 'Ta gêne, si tu l\'as — elle est bienvenue ici' },
        ],
      },
    ],
  },
  {
    slug: 'evenements', title: 'Événements',
    sections: [
      {
        stable_key: 'formats', component_type: 'icon-title-body-status-grid',
        items: [
          { icon: '✦', title: 'Ateliers réguliers', body: 'Notre format phare — 2 heures, petit groupe, récurrence mensuelle ou bimensuelle selon la demande.', label: 'Lancement imminent', variant: 'fuchsia' },
          { icon: '🎭', title: 'Soirées thématiques', body: "Des soirées autour d'un thème : rire et absurde, voix et présence, impro légère, connexion entre inconnu·es.", label: 'En préparation', variant: 'corail' },
          { icon: '🏢', title: 'Ateliers privés', body: "Pour les groupes d'ami·es, les familles, les équipes. Un atelier sur mesure dans un espace de ton choix.", label: 'Disponible sur demande', variant: 'soleil' },
          { icon: '💼', title: 'Ateliers corporatifs', body: "Pour les équipes qui veulent s'exprimer autrement. Cohésion, communication, présence, confiance.", label: 'Bientôt disponible', variant: 'emeraude' },
        ],
      },
    ],
  },
];

async function main() {
  let totalSections = 0, totalItems = 0;
  for (const page of PAGES) {
    for (const section of page.sections) {
      totalSections++;
      totalItems += section.items.length;
    }
  }
  console.log(`${apply ? 'APPLYING' : 'DRY RUN (pass --apply to write)'} — ${PAGES.length} pages, ${totalSections} sections, ${totalItems} items`);

  for (const page of PAGES) {
    console.log(`  ${page.slug}: ${page.sections.map((s) => `${s.stable_key} (${s.items.length})`).join(', ')}`);
  }

  if (!apply) { console.log('\nNo changes written. Re-run with --apply.'); return; }

  const env = loadEnv();
  const admin = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: frLocale } = await admin.from('locales').select('id').eq('code', 'fr-CA').single();
  if (!frLocale) { console.error('fr-CA locale not found'); process.exit(1); }

  for (let pageIndex = 0; pageIndex < PAGES.length; pageIndex++) {
    const page = PAGES[pageIndex];

    const { data: pageRow, error: pageErr } = await admin
      .from('pages')
      .upsert({ slug: page.slug, status: 'published', visible: true, sort_order: pageIndex + 1 }, { onConflict: 'slug' })
      .select('id').single();
    if (pageErr) { console.error(`page ${page.slug} failed:`, pageErr.message); continue; }

    await admin.from('page_translations').upsert(
      { page_id: pageRow.id, locale_id: frLocale.id, title: page.title },
      { onConflict: 'page_id,locale_id' },
    );
    console.log(`OK page: ${page.slug}`);

    for (let sectionIndex = 0; sectionIndex < page.sections.length; sectionIndex++) {
      const section = page.sections[sectionIndex];

      const { data: sectionRow, error: sectionErr } = await admin
        .from('sections')
        .upsert(
          { page_id: pageRow.id, stable_key: section.stable_key, component_type: section.component_type, visible: true, sort_order: sectionIndex },
          { onConflict: 'page_id,stable_key' },
        )
        .select('id').single();
      if (sectionErr) { console.error(`section ${page.slug}/${section.stable_key} failed:`, sectionErr.message); continue; }

      for (let itemIndex = 0; itemIndex < section.items.length; itemIndex++) {
        const item = section.items[itemIndex];
        const stableKey = `${section.stable_key}-${itemIndex}`;

        const { data: itemRow, error: itemErr } = await admin
          .from('content_items')
          .upsert(
            {
              section_id: sectionRow.id, item_type: section.component_type, stable_key: stableKey,
              visual_variant: item.variant ?? null, icon_key: item.icon ?? null,
              visible: true, sort_order: itemIndex, status: 'published',
            },
            { onConflict: 'section_id,stable_key' },
          )
          .select('id').single();
        if (itemErr) { console.error(`content_item ${page.slug}/${section.stable_key}/${stableKey} failed:`, itemErr.message); continue; }

        const { error: itemTrErr } = await admin
          .from('content_item_translations')
          .upsert(
            { content_item_id: itemRow.id, locale_id: frLocale.id, title: item.title ?? null, body: item.body ?? null, label: item.label ?? null },
            { onConflict: 'content_item_id,locale_id' },
          );
        if (itemTrErr) { console.error(`content_item_translations ${page.slug}/${section.stable_key}/${stableKey} failed:`, itemTrErr.message); continue; }
      }
      console.log(`  OK section: ${section.stable_key} (${section.items.length} items)`);
    }
  }

  console.log('\nSeed complete.');
}

main().catch((err) => { console.error(err); process.exit(1); });
