import { nextWorkshop } from './nextWorkshop';

export interface Offer {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  duration: string;
  groupSize: string;
  price: string;
  location: string;
  level: string;
  status: 'active' | 'coming-soon' | 'available-soon';
  accentColor: 'fuchsia' | 'corail' | 'soleil' | 'emeraude';
  icon: string;
  href: string;
}

export const offers: Offer[] = [
  {
    id: 'atelier-decouverte',
    title: 'Atelier découverte',
    subtitle: 'On rit. On joue. On s\'exprime.',
    description: 'Une entrée douce dans l\'univers de l\'expression. Rires, jeux, mouvement et cercle de partage. Tu n\'as besoin d\'aucun talent, d\'aucune expérience, d\'aucune performance.',
    duration: '2 heures',
    groupSize: nextWorkshop.capacity,
    price: nextWorkshop.price,
    location: nextWorkshop.location,
    level: 'Débutant·es bienvenu·es',
    status: 'active',
    accentColor: 'fuchsia',
    icon: '✦',
    href: '/ateliers',
  },
  {
    id: 'rire-lacher-prise',
    title: 'Rire et lâcher-prise',
    subtitle: 'Retrouver la légèreté',
    description: 'Un atelier dédié au rire libérateur, aux jeux absurdes, et à la permission de ne pas se prendre au sérieux. Bientôt disponible.',
    duration: '2 heures',
    groupSize: '6 à 10 personnes',
    price: 'À venir',
    location: 'Rive-Sud de Montréal',
    level: 'Tous niveaux',
    status: 'coming-soon',
    accentColor: 'soleil',
    icon: '◉',
    href: '/ateliers',
  },
  {
    id: 'voix-presence',
    title: 'Voix et présence',
    subtitle: 'Occuper l\'espace avec confiance',
    description: 'Travailler la voix, le regard, le souffle, la présence dans le groupe. Pas de chant, pas de spectacle. Juste apprendre à être là, pleinement.',
    duration: '2 heures',
    groupSize: '6 à 10 personnes',
    price: 'À venir',
    location: 'Rive-Sud de Montréal',
    level: 'Tous niveaux',
    status: 'coming-soon',
    accentColor: 'corail',
    icon: '▲',
    href: '/ateliers',
  },
  {
    id: 'expression-corporelle',
    title: 'Expression corporelle',
    subtitle: 'Bouger sans se juger',
    description: 'Retrouver son corps comme un outil d\'expression. Mouvement libre, gestes, énergie. Ni yoga, ni danse. Quelque chose de plus brut et plus joyeux.',
    duration: '2 heures',
    groupSize: '6 à 10 personnes',
    price: 'À venir',
    location: 'Rive-Sud de Montréal',
    level: 'Tous niveaux',
    status: 'coming-soon',
    accentColor: 'emeraude',
    icon: '❋',
    href: '/ateliers',
  },
];
