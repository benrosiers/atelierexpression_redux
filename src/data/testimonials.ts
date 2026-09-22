export interface Testimonial {
  quote: string;
  name: string;
  detail: string;
  isPlaceholder: boolean;
}

export const testimonials: Testimonial[] = [
  {
    quote: 'Je suis arrivée en me demandant pourquoi j\'étais là. Je suis repartie en me demandant pourquoi j\'avais attendu si longtemps.',
    name: 'M.L.',
    detail: 'Participante, atelier découverte — Témoignage à venir',
    isPlaceholder: true,
  },
  {
    quote: 'J\'ai ri d\'une façon que je n\'avais pas ressentie depuis des années. Pas un rire poli — un vrai rire.',
    name: 'S.B.',
    detail: 'Participante, atelier découverte — Témoignage à venir',
    isPlaceholder: true,
  },
  {
    quote: 'J\'avais peur de paraître ridicule. Et finalement, c\'est exactement ça qui m\'a libérée.',
    name: 'C.T.',
    detail: 'Participante, atelier découverte — Témoignage à venir',
    isPlaceholder: true,
  },
];
