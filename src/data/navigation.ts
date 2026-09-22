import { nextWorkshop as staticNextWorkshop } from './nextWorkshop';
import { getNextWorkshop } from '../lib/content/publicContent';

export interface NavItem {
  label: string;
  href: string;
  accent?: boolean;
}

export const mainNav: NavItem[] = [
  { label: 'Calendrier', href: '/calendrier' },
  { label: 'Ateliers', href: '/ateliers' },
  { label: 'Parcours', href: '/parcours' },
  { label: 'Événements', href: '/evenements' },
  { label: 'À propos', href: '/a-propos' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Contact', href: '/contact' },
];

// Label follows the real workshop status (CMS-first, src/data/nextWorkshop.ts
// fallback) — never implies open registration while status is 'building'.
// A function, not a plain const, because it needs an async CMS read —
// callers must `await getCtaNav()`.
export async function getCtaNav(): Promise<NavItem> {
  const nextWorkshop = (await getNextWorkshop()) ?? staticNextWorkshop;
  return {
    label: nextWorkshop.status === 'building' ? nextWorkshop.ctaLabel : 'Réserver',
    href: '/reserver',
    accent: true,
  };
}

export const footerNav: NavItem[][] = [
  [
    { label: 'Accueil', href: '/' },
    { label: 'Ateliers', href: '/ateliers' },
    { label: 'Parcours', href: '/parcours' },
    { label: 'Événements', href: '/evenements' },
  ],
  [
    { label: 'À propos', href: '/a-propos' },
    { label: 'Communauté', href: '/communaute' },
    { label: 'Témoignages', href: '/temoignages' },
    { label: 'Ressources', href: '/ressources' },
  ],
  [
    { label: 'FAQ', href: '/faq' },
    { label: 'Contact', href: '/contact' },
    { label: 'Réserver', href: '/reserver' },
    { label: 'Mentions légales', href: '/mentions-legales' },
  ],
];
