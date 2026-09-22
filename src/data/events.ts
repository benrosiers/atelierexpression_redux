import { nextWorkshop } from './nextWorkshop';

export interface Event {
  id: string;
  title: string;
  date: string | null;
  time: string | null;
  location: string;
  description: string;
  price: string;
  status: 'upcoming' | 'announced-soon' | 'past';
  href: string;
}

// This list currently mirrors `nextWorkshop` (the single source of truth —
// see src/data/nextWorkshop.ts). Once several distinct dated events exist,
// add entries here directly instead of duplicating the building placeholder.
export const events: Event[] = [
  {
    id: 'atelier-decouverte-prochain',
    title: 'Atelier découverte',
    date: nextWorkshop.date,
    time: nextWorkshop.time,
    location: nextWorkshop.location,
    description: nextWorkshop.details,
    price: nextWorkshop.price,
    status: nextWorkshop.status === 'building' ? 'announced-soon' : 'upcoming',
    href: '/reserver',
  },
];
