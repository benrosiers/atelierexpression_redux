// Single source of truth for the next workshop's real-world status.
// To activate a date: change `status` to 'date-announced' (or later) and fill in
// date/time/location/registrationUrl. Every page that shows workshop scheduling
// reads from this file — nothing else needs to change.
//
// See docs/NEXT_WORKSHOP_CONTENT_MODEL.md for the full explanation.

export type WorkshopStatus =
  | 'building'          // en préparation — pas de date, formulaire d'intérêt seulement
  | 'date-announced'    // date connue, inscriptions pas encore ouvertes
  | 'registration-open' // inscriptions ouvertes, formulaire de réservation actif
  | 'sold-out'          // complet, liste d'attente
  | 'completed';        // atelier passé

export interface NextWorkshop {
  status: WorkshopStatus;
  date: string | null;
  time: string | null;
  location: string;
  capacity: string;
  price: string;
  registrationUrl: string | null;
  interestFormUrl: string | null;
  shortDescription: string;
  details: string;
  ctaLabel: string;
}

export const nextWorkshop: NextWorkshop = {
  status: 'building',
  date: null,
  time: null,
  location: 'Longueuil (adresse exacte à confirmer)',
  capacity: '10 à 15 personnes',
  price: '45 $ CA',
  registrationUrl: null,
  interestFormUrl: '#interet-prochain-atelier',
  shortDescription: 'La prochaine édition de l\'atelier découverte se prépare.',
  details:
    'La formule se précise : le contenu de l\'atelier démo a donné de bonnes indications ' +
    'sur ce qui fonctionne. Aucune date officielle n\'est encore fixée. Les personnes qui ' +
    'manifestent leur intérêt maintenant seront informées en priorité, avant l\'annonce publique.',
  ctaLabel: 'Être averti·e du prochain atelier',
};

// Human-readable copy for each status, used where the UI needs to explain
// the state rather than just branch on it.
export const workshopStatusCopy: Record<WorkshopStatus, { badge: string; note: string }> = {
  building: {
    badge: 'En préparation',
    note: 'Aucune date officielle pour l\'instant — manifeste ton intérêt pour être averti·e en premier.',
  },
  'date-announced': {
    badge: 'Date annoncée',
    note: 'La date est fixée. Les inscriptions ouvrent bientôt.',
  },
  'registration-open': {
    badge: 'Inscriptions ouvertes',
    note: 'Les places sont limitées — réserve la tienne dès maintenant.',
  },
  'sold-out': {
    badge: 'Complet',
    note: 'Cette édition est complète. Rejoins la liste d\'attente pour la suivante.',
  },
  completed: {
    badge: 'Terminé',
    note: 'Cette édition est passée. La suivante se prépare.',
  },
};
