# Atelier Expression — Site Web

Site statique pour **Atelier Expression** (atelierexpression.ca), construit avec Astro + SCSS.

## Démarrage rapide

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # construit vers dist/
npm run preview    # prévisualiser le build
npm run validate   # vérifie la cohérence du modèle de contenu (nextWorkshop, FAQ, témoignages…)
```

## Stack technique

- [Astro](https://astro.build) — générateur de site statique
- SCSS — styles (tokens, global, layout, animations)
- TypeScript — données et types
- Vanilla JS — micro-interactions
- `@astrojs/sitemap` — sitemap automatique

## Structure

```
src/
  components/   # BaseLayout, Header, Footer, Hero, etc.
  pages/        # Toutes les routes (Astro = file-based routing)
  styles/       # tokens.scss, global.scss, layout.scss, animations.scss
  data/         # site.ts, navigation.ts, offers.ts, faqs.ts, etc.
public/
  assets/images/  # Images déployées (copies des assets raw)
  favicon.svg
  robots.txt
raw/              # Assets originaux — NE PAS SUPPRIMER
docs/             # Documentation stratégique et opérationnelle
```

## Pages

| Route | Page |
|-------|------|
| `/` | Accueil |
| `/ateliers` | Les ateliers |
| `/parcours` | Parcours (bientôt) |
| `/evenements` | Événements |
| `/a-propos` | À propos / Cindy |
| `/communaute` | La communauté |
| `/temoignages` | Témoignages (placeholder) |
| `/faq` | Foire aux questions |
| `/contact` | Contact |
| `/reserver` | Prochain atelier — formulaire d'intérêt (ou réservation, une fois une date fixée) |
| `/ressources` | Ressources / Blog |
| `/mentions-legales` | Mentions légales |

## Documentation

- `docs/BRAND_STRATEGY.md` — Identité, palette, ton, règles
- `docs/ASSET_INVENTORY.md` — État des assets, ce qui manque
- `docs/CONTENT_STRATEGY.md` — Voix, SEO, calendrier éditorial
- `docs/REFERENCE_ANALYSIS.md` — Analyse des sites de référence
- `docs/EMAIL_SERVICE_PLAN.md` — Stratégie formulaires et courriel
- `docs/DEPLOYMENT_GITHUB_PAGES.md` — Guide de déploiement
- `docs/WEBSITE_AUDIT_CLIENTELE.md` — Audit clientèle : positionnement, conversion, technique
- `docs/NEXT_WORKSHOP_CONTENT_MODEL.md` — Modèle de donnée du prochain atelier (`src/data/nextWorkshop.ts`)
- `docs/DEMO_WORKSHOP_RECAP_NOTES.md` — Ce qui existe réellement comme contenu vidéo/photo (pas d'atelier démo de groupe)
- `docs/MEDIA_INVENTORY.md` — Inventaire des médias, consentement, manifeste des dérivés déployés

## Déploiement

Voir `docs/DEPLOYMENT_GITHUB_PAGES.md` pour les étapes complètes.

Le workflow `.github/workflows/deploy.yml` est prêt mais désactivé.
Retirer les lignes `if: false` pour activer le déploiement automatique.

## Assets manquants (priorité)

1. Photographie de groupe d'atelier — un vrai atelier de groupe n'a pas encore eu lieu, voir
   `docs/DEMO_WORKSHOP_RECAP_NOTES.md`
2. Témoignages réels (post-premiers ateliers)

Le logo final vectoriel et l'image OG (1200×630px) sont maintenant en place. Voir
`docs/ASSET_INVENTORY.md` pour les détails complets.

## Activer la collecte de courriels

Tous les formulaires (intérêt pour le prochain atelier, infolettre, contact, réservation)
utilisent un formulaire Formspree partagé, configuré via `PUBLIC_FORM_ENDPOINT` (voir
`.env.example` et `docs/EMAIL_SERVICE_PLAN.md`). Sans cette variable, chaque formulaire affiche
clairement qu'il n'est pas encore activé et propose un repli par courriel — aucun formulaire ne
simule un envoi réussi.
