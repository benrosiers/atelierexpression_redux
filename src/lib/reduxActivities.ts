import rawActivities from '../../public/activites.json';

export type ActivityType =
  | 'atelier'
  | 'evenement'
  | 'gym-social';

export type ActivityStatus =
  | 'announced'
  | 'open'
  | 'full'
  | 'cancelled';

export interface Activity {
  slug: string;
  type: ActivityType;
  title: string;
  summary: string;
  description: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  location: string;
  host: string;
  priceCents: number;
  capacity: number;
  status: ActivityStatus;
}

export const activities: Activity[] = (
  rawActivities as Activity[]
).slice().sort(
  (a, b) => a.startsAt.localeCompare(b.startsAt)
);

export const activityTypes: Record<ActivityType, string> = {
  atelier: 'Atelier',
  evenement: 'Événement',
  'gym-social': 'Gym social',
};

export const activityStatuses: Record<ActivityStatus, string> = {
  announced: 'Date annoncée',
  open: 'Inscriptions à confirmer',
  full: 'Complet',
  cancelled: 'Annulé',
};

export function formatActivityDate(value: string): string {
  return new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'America/Toronto',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('fr-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(cents / 100);
}