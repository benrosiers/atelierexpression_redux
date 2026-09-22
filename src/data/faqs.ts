import { nextWorkshop } from './nextWorkshop';

export interface FAQ {
  question: string;
  answer: string;
  category?: string;
}

export const faqs: FAQ[] = [
  {
    question: 'Je suis très gêné·e. Est-ce que c\'est vraiment pour moi?',
    answer: 'Oui, c\'est précisément pour toi. La plupart des participant·es arrivent avec un peu d\'appréhension, et c\'est complètement normal. Les ateliers sont conçus pour les personnes qui ne sont pas à l\'aise, pas pour celles qui le sont déjà. On commence lentement. On ne force rien. Et on rit ensemble de la maladresse — c\'est souvent là que la magie opère.',
    category: 'accessibilité',
  },
  {
    question: 'Dois-je avoir de l\'expérience en théâtre ou en improvisation?',
    answer: 'Non, aucune. Ce n\'est pas un cours de théâtre ni d\'improvisation, et personne n\'évalue ta performance. Les jeux et exercices sont conçus pour être accessibles à des adultes qui n\'ont jamais rien fait de ce genre.',
    category: 'accessibilité',
  },
  {
    question: 'Est-ce que je dois être drôle?',
    answer: 'Absolument pas. Être drôle, ça ne s\'enseigne pas et ça ne se demande pas. Ce qui se passe dans nos ateliers, c\'est le rire naturel qui émerge du jeu, de la surprise, de la connexion. Tu n\'as pas à performer. Tu n\'as pas à faire rire quelqu\'un. Tu viens juste être là.',
    category: 'accessibilité',
  },
  {
    question: 'Est-ce que je devrai danser?',
    answer: 'Non, ce n\'est pas un cours de danse. Il y a du mouvement dans les ateliers — parce que le corps fait partie de l\'expression — mais jamais de chorégraphie, jamais de performance imposée. Tout ce qui implique le corps est proposé, jamais obligatoire.',
    category: 'accessibilité',
  },
  {
    question: 'Est-ce que je vais devoir parler devant tout le monde?',
    answer: 'Pas dans le sens d\'un discours ou d\'une présentation. Les ateliers incluent des moments de partage en groupe, mais ils sont courts, bienveillants, et personne n\'est forcé·e de prendre la parole. Tu peux écouter si tu préfères. La sécurité de chacun·e est au cœur du format.',
    category: 'accessibilité',
  },
  {
    question: 'Est-ce que c\'est thérapeutique?',
    answer: 'Non. Atelier Expression n\'est pas un service thérapeutique, et Cindy n\'est pas thérapeute. Ce sont des ateliers d\'expression et de jeu pour adultes. Si des choses se libèrent — et c\'est possible — c\'est dans un espace joyeux et sécuritaire, pas clinique. Si tu traverses une période difficile, ces ateliers peuvent être complémentaires à un suivi professionnel, mais ils ne s\'y substituent pas.',
    category: 'contenu',
  },
  {
    question: 'Est-ce mixte?',
    answer: 'Oui. Les ateliers sont ouverts à toutes les personnes adultes qui souhaitent se retrouver dans un espace d\'expression bienveillant. Hommes, femmes, personnes non-binaires — tout le monde est bienvenu·e. L\'ambiance est inclusive et chaleureuse.',
    category: 'format',
  },
  {
    question: 'Quoi porter?',
    answer: 'Des vêtements confortables dans lesquels tu peux bouger librement. Ni talons, ni costumes. Juste quelque chose qui ne te retient pas. Des chaussettes ou des chaussures légères, selon le lieu.',
    category: 'pratique',
  },
  {
    question: 'Est-ce que je peux venir seul·e?',
    answer: 'Oui, et c\'est souvent comme ça que ça se passe. Venir seul·e, c\'est aussi un acte d\'audace. Tu ne seras pas seul·e longtemps — les exercices créent rapidement du lien et de la chaleur entre les participant·es.',
    category: 'pratique',
  },
  {
    question: 'Est-ce que je peux partir si je suis mal à l\'aise?',
    answer: 'Oui, toujours. Tu es libre de poser une pause, de sortir un moment, ou de simplement observer si tu as besoin de prendre du recul. Il n\'y a aucune obligation de performance ni de présence forcée. Ton confort est prioritaire.',
    category: 'sécurité',
  },
  {
    question: 'Combien de personnes par atelier?',
    answer: `${nextWorkshop.capacity}, maximum. Ce format petit groupe est intentionnel: il permet une atmosphère sécurisante, des échanges vrais, et une attention réelle pour chaque personne présente.`,
    category: 'format',
  },
  {
    question: 'Où ont lieu les ateliers?',
    answer: 'À Longueuil, sur la Rive-Sud de Montréal, dans des espaces partenaires choisis pour leur ambiance chaleureuse et leur accessibilité. L\'adresse exacte est communiquée lors de l\'inscription. Des déplacements peuvent être possibles selon la demande.',
    category: 'pratique',
  },
  {
    question: 'Comment réserver?',
    answer: 'Le prochain atelier est encore en préparation — aucune date n\'est fixée, donc les réservations ne sont pas encore ouvertes. En attendant, tu peux manifester ton intérêt sur la page "Prochain atelier" pour être averti·e en priorité dès que la date sera annoncée. Une fois les inscriptions ouvertes, la réservation se fera directement sur ce site.',
    category: 'pratique',
  },
  {
    question: 'Puis-je simplement être averti·e de la prochaine date, sans m\'engager?',
    answer: 'Oui, complètement. Manifester ton intérêt ne constitue ni une réservation ni un engagement ferme. Ça sert uniquement à te prévenir en priorité, par courriel, dès que la date et le lieu seront confirmés.',
    category: 'pratique',
  },
  {
    question: 'Est-ce que les activités sont filmées?',
    answer: 'Lors de l\'atelier démo, quelques photos ont été prises — c\'est ce qu\'on te montre sur ce site (voir "Ce qui s\'est passé lors de notre atelier démo"). Si de la captation photo ou vidéo est prévue lors des prochains ateliers, ce sera annoncé clairement à l\'avance, et tu pourras toujours demander à rester hors-cadre.',
    category: 'sécurité',
  },
  {
    question: 'Y aura-t-il des ateliers privés ou corporatifs?',
    answer: 'Oui, c\'est prévu. Des ateliers sur mesure pour des groupes privés, des équipes, des événements spéciaux sont en développement. Si tu as un projet ou une demande spécifique, envoie-nous un message via la page Contact — on adore les nouvelles collaborations.',
    category: 'futur',
  },
];
