/**
 * Bibliothèque de méthodes de révision : des fiches courtes et concrètes, chacune reliée à une
 * action dans Bûcheur (réglage du minuteur, fiches, tâches…).
 */

export type MethodCategory =
  | 'Concentration'
  | 'Mémoriser'
  | 'Comprendre'
  | 'Organisation'
  | 'Bien-être'
  | 'Jour J';

export const METHOD_CATEGORIES: MethodCategory[] = [
  'Concentration',
  'Mémoriser',
  'Comprendre',
  'Organisation',
  'Bien-être',
  'Jour J',
];

export type MethodAction =
  /** Règle la durée des séances et des pauses, puis ouvre l'accueil. */
  | { kind: 'timer'; label: string; focusMin: number; breakMin: number; longBreakEvery?: number }
  /** Ouvre une page de Bûcheur. */
  | { kind: 'link'; label: string; href: '/fiches' | '/taches' | '/examens' | '/stats' | '/' };

export type Method = {
  id: string;
  title: string;
  category: MethodCategory;
  /** Temps de lecture, en minutes. */
  readMin: number;
  /** Une phrase pour donner envie. */
  summary: string;
  /** Pourquoi ça marche. */
  why: string;
  steps: string[];
  /** Le conseil à retenir. */
  tip: string;
  action?: MethodAction;
};

export const METHODS: Method[] = [
  {
    id: 'pomodoro',
    title: 'La technique Pomodoro',
    category: 'Concentration',
    readMin: 2,
    summary: '25 minutes de travail, 5 minutes de pause. Simple, et redoutablement efficace.',
    why: 'Un temps court et défini rend le démarrage facile et limite la fatigue : on sait que la pause arrive. Les pauses régulières entretiennent l’attention sur toute la journée.',
    steps: [
      'Choisis une seule tâche précise (ex. « exercices 3 à 6 du chapitre 4 »).',
      'Lance une séance de 25 minutes et ne fais rien d’autre.',
      'Si une idée parasite arrive, note-la et reviens à ta tâche.',
      'Prends 5 minutes de vraie pause : lève-toi, bois de l’eau.',
      'Toutes les 4 séances, accorde-toi une pause longue de 15 à 30 minutes.',
    ],
    tip: 'Le téléphone hors de la pièce vaut mieux que le téléphone retourné sur la table.',
    action: {
      kind: 'timer',
      label: 'Régler sur 25 / 5',
      focusMin: 25,
      breakMin: 5,
      longBreakEvery: 4,
    },
  },
  {
    id: 'deep-work',
    title: 'Les séances longues (52 / 17)',
    category: 'Concentration',
    readMin: 2,
    summary: 'Pour les dissertations et les problèmes difficiles qui demandent de l’élan.',
    why: 'Certaines tâches demandent 10 à 15 minutes avant d’être vraiment dedans. Une séance plus longue laisse le temps d’atteindre cette concentration profonde, puis une vraie pause permet de récupérer.',
    steps: [
      'Réserve ce format aux tâches exigeantes : rédaction, problèmes, synthèse.',
      'Prépare tout avant de lancer : sujet, brouillon, calculatrice, eau.',
      'Travaille 50 minutes environ sans interruption.',
      'Pause de 15 à 20 minutes, loin des écrans si possible.',
      'Ne dépasse pas 3 ou 4 séances longues par jour.',
    ],
    tip: 'Alterne : séances longues le matin pour le difficile, Pomodoro l’après-midi pour le reste.',
    action: { kind: 'timer', label: 'Régler sur 50 / 15', focusMin: 50, breakMin: 15 },
  },
  {
    id: 'rappel-actif',
    title: 'Le rappel actif',
    category: 'Mémoriser',
    readMin: 3,
    summary: 'Fermer le cours et se forcer à retrouver. La méthode la plus efficace pour retenir.',
    why: 'Relire donne une impression de maîtrise mais s’oublie vite. Chercher une réponse dans sa mémoire renforce le souvenir : c’est l’« effet de test », l’un des résultats les plus solides de la recherche sur l’apprentissage.',
    steps: [
      'Lis une partie du cours une seule fois, attentivement.',
      'Ferme le cours et écris tout ce dont tu te souviens sur une feuille blanche.',
      'Rouvre le cours et complète au stylo d’une autre couleur ce qui manquait.',
      'Transforme les oublis en fiches question / réponse.',
      'Recommence le lendemain, sans regarder.',
    ],
    tip: 'Si c’est facile, ce n’est pas assez : l’effort de recherche est ce qui fait retenir.',
    action: { kind: 'link', label: 'Créer des fiches', href: '/fiches' },
  },
  {
    id: 'repetition-espacee',
    title: 'La répétition espacée',
    category: 'Mémoriser',
    readMin: 3,
    summary: 'Revoir juste avant d’oublier. Les fiches de Bûcheur le font pour toi.',
    why: 'On oublie très vite après avoir appris, puis de plus en plus lentement à chaque révision. Espacer les révisions (1 jour, 2 jours, 4 jours, 8 jours…) retient beaucoup plus avec moins de temps total.',
    steps: [
      'Crée une fiche par notion : une question au recto, une réponse courte au verso.',
      'Chaque jour, révise les fiches que Bûcheur te propose.',
      'Bonne réponse : la fiche monte d’une boîte et reviendra plus tard.',
      'Erreur : elle retourne dans la première boîte et revient dès demain.',
      'Une fiche en boîte 5 est acquise : elle ne revient que tous les 16 jours.',
    ],
    tip: '10 minutes de fiches chaque jour valent mieux qu’une heure la veille de l’examen.',
    action: { kind: 'link', label: 'Réviser mes fiches', href: '/fiches' },
  },
  {
    id: 'feynman',
    title: 'La méthode Feynman',
    category: 'Comprendre',
    readMin: 2,
    summary:
      'Expliquer simplement, comme à un élève plus jeune, pour repérer ce qu’on n’a pas compris.',
    why: 'Quand on doit expliquer avec des mots simples, les trous de compréhension deviennent évidents. On ne peut plus se cacher derrière le vocabulaire du cours.',
    steps: [
      'Écris le nom de la notion en haut d’une feuille.',
      'Explique-la par écrit ou à voix haute, comme à un élève de 12 ans.',
      'Repère les endroits où tu bloques ou utilises du jargon.',
      'Retourne au cours pour combler ces trous.',
      'Simplifie encore, avec un exemple ou une comparaison.',
    ],
    tip: 'Expliquer à un ami, à un parent ou même à ta plante fonctionne très bien.',
  },
  {
    id: 'carte-mentale',
    title: 'La carte mentale',
    category: 'Comprendre',
    readMin: 2,
    summary: 'Un chapitre entier sur une page, avec les liens entre les idées.',
    why: 'Organiser les idées autour d’un centre oblige à hiérarchiser et à relier les notions entre elles. Une page visuelle se mémorise plus facilement qu’un texte linéaire.',
    steps: [
      'Écris le thème au centre d’une feuille en paysage.',
      'Trace une branche par grande partie, avec un mot-clé chacune.',
      'Ajoute les détails en sous-branches : dates, formules, exemples.',
      'Utilise des couleurs et de petits dessins.',
      'Refais-la de mémoire quelques jours plus tard pour tester ce que tu as retenu.',
    ],
    tip: 'Une carte mentale se fait sans le cours la deuxième fois : c’est là qu’elle devient utile.',
  },
  {
    id: 'exercices-entrelaces',
    title: 'Les exercices mélangés',
    category: 'Comprendre',
    readMin: 2,
    summary: 'Mélanger les types d’exercices plutôt que d’enchaîner les mêmes.',
    why: 'Enchaîner 10 exercices identiques donne l’illusion de maîtriser. Les mélanger oblige à reconnaître quelle méthode utiliser, exactement comme le jour de l’examen.',
    steps: [
      'Choisis des exercices de 2 ou 3 chapitres différents.',
      'Mélange-les avant de commencer.',
      'Pour chacun, identifie d’abord la méthode avant de calculer.',
      'Corrige-toi immédiatement et note les erreurs récurrentes.',
    ],
    tip: 'Parfait pour les maths, la physique, les langues (grammaire) et l’économie.',
    action: { kind: 'link', label: 'Ajouter à mes tâches', href: '/taches' },
  },
  {
    id: 'planning-retro',
    title: 'Le planning à rebours',
    category: 'Organisation',
    readMin: 3,
    summary: 'Partir de la date d’examen pour savoir quoi faire chaque semaine.',
    why: 'Sans plan, on révise ce qu’on aime et on repousse le reste. Partir de l’échéance et découper rend la charge visible et évite le rush de la dernière semaine.',
    steps: [
      'Ajoute la date de chaque examen dans Bûcheur.',
      'Liste tous les chapitres à revoir, matière par matière.',
      'Répartis-les sur les semaines disponibles, en gardant la dernière semaine pour la révision générale.',
      'Transforme chaque chapitre en tâches concrètes avec une échéance.',
      'Chaque dimanche, ajuste le plan selon ce qui a été fait.',
    ],
    tip: 'Prévois 20 % de marge : il y aura toujours des imprévus.',
    action: { kind: 'link', label: 'Ajouter mes examens', href: '/examens' },
  },
  {
    id: 'trois-taches',
    title: 'La règle des 3 tâches',
    category: 'Organisation',
    readMin: 1,
    summary: 'Chaque matin, trois tâches. Pas dix.',
    why: 'Une liste trop longue décourage et ne sera jamais finie. Trois tâches réalistes, terminées, donnent un vrai sentiment d’avancer et entretiennent la motivation.',
    steps: [
      'Le soir ou le matin, choisis trois tâches précises pour la journée.',
      'Commence par la plus difficile, quand tu es le plus frais.',
      'Coche-les dès qu’elles sont faites.',
      'Si tu as fini, tu peux en ajouter une, mais pas avant.',
    ],
    tip: '« Réviser l’histoire » n’est pas une tâche. « Fiches sur la guerre froide, partie 1 » en est une.',
    action: { kind: 'link', label: 'Ouvrir mes tâches', href: '/taches' },
  },
  {
    id: 'sommeil',
    title: 'Dormir pour retenir',
    category: 'Bien-être',
    readMin: 2,
    summary: 'Le sommeil n’est pas du temps perdu : c’est là que la mémoire se consolide.',
    why: 'Pendant le sommeil, le cerveau trie et consolide ce qui a été appris dans la journée. Une nuit blanche avant un examen fait perdre bien plus qu’elle ne fait gagner.',
    steps: [
      'Vise 8 heures de sommeil, à heures régulières.',
      'Révise tes fiches le soir, puis dors : c’est le meilleur moment pour mémoriser.',
      'Coupe les écrans 30 minutes avant de dormir.',
      'Une sieste de 20 minutes après le déjeuner peut relancer l’après-midi.',
    ],
    tip: 'Jamais de nuit blanche la veille d’un examen. Jamais.',
  },
  {
    id: 'pauses-actives',
    title: 'Des pauses qui reposent vraiment',
    category: 'Bien-être',
    readMin: 2,
    summary: 'Une pause sur les réseaux sociaux n’en est pas une.',
    why: 'Faire défiler un fil d’actualité continue de solliciter l’attention : on revient plus fatigué. Bouger, s’aérer ou simplement regarder au loin repose réellement le cerveau et les yeux.',
    steps: [
      'Lève-toi et marche, même deux minutes.',
      'Bois un verre d’eau : la déshydratation diminue la concentration.',
      'Regarde par la fenêtre, au loin, pour reposer tes yeux.',
      'Quelques étirements des épaules et du cou.',
      'Garde le téléphone pour la pause longue, si vraiment nécessaire.',
    ],
    tip: 'Active « Proposer une pause » dans les réglages : Bûcheur te la rappellera.',
  },
  {
    id: 'stress',
    title: 'Apprivoiser le stress',
    category: 'Bien-être',
    readMin: 2,
    summary: 'Un peu de stress aide. Beaucoup de stress bloque. Voici comment garder l’équilibre.',
    why: 'Le stress mobilise l’énergie, mais au-delà d’un certain point il perturbe la mémoire et le raisonnement. La respiration lente et la préparation réduisent cette surcharge.',
    steps: [
      'Respiration 4-6 : inspire 4 secondes, expire 6 secondes, pendant 2 minutes.',
      'Écris tes inquiétudes sur papier avant de réviser : elles occupent moins la tête.',
      'Regarde ce que tu as déjà fait dans tes statistiques, pas seulement ce qui reste.',
      'Garde au moins une activité plaisir chaque jour (sport, musique, amis).',
    ],
    tip: 'Si l’angoisse devient envahissante, parles-en à quelqu’un : un proche, un professeur, l’infirmerie scolaire.',
    action: { kind: 'link', label: 'Voir mes progrès', href: '/stats' },
  },
  {
    id: 'annales',
    title: 'S’entraîner sur les annales',
    category: 'Jour J',
    readMin: 2,
    summary: 'Faire les sujets des années précédentes, en conditions réelles.',
    why: 'S’entraîner dans les conditions de l’épreuve (durée, sans cours, sans téléphone) réduit la surprise le jour J et révèle ce qui reste à travailler.',
    steps: [
      'Trouve les sujets des années précédentes (site de ton établissement, annales officielles).',
      'Fais-en un en temps limité, sans cours.',
      'Corrige-toi avec le corrigé, honnêtement.',
      'Note les erreurs dans une tâche « à retravailler ».',
      'Recommence avec un autre sujet la semaine suivante.',
    ],
    tip: 'Une séance longue de Bûcheur peut servir de chronomètre d’épreuve.',
    action: { kind: 'timer', label: 'Séance de 2 h', focusMin: 120, breakMin: 15 },
  },
  {
    id: 'veille-examen',
    title: 'La veille et le matin de l’examen',
    category: 'Jour J',
    readMin: 2,
    summary: 'Ce qu’il faut faire, et surtout ne pas faire, dans les dernières 24 heures.',
    why: 'La veille, on n’apprend plus rien de neuf de façon durable. L’objectif est d’arriver reposé, confiant et organisé.',
    steps: [
      'La veille : relis seulement tes fiches et tes cartes mentales, pas de nouveau chapitre.',
      'Prépare tes affaires : convocation, pièce d’identité, stylos, calculatrice, eau.',
      'Couche-toi à ton heure habituelle.',
      'Le matin : un vrai petit-déjeuner, et pars en avance.',
      'Pendant l’épreuve : lis tout le sujet, commence par ce que tu sais faire.',
    ],
    tip: 'Ce que tu ne sais pas la veille au soir, tu ne l’apprendras pas cette nuit. Dors.',
  },
];

/** La méthode mise en avant aujourd'hui (change chaque jour). */
export function methodOfTheDay(now: number): Method {
  const day = Math.floor(now / 86_400_000);
  return METHODS[day % METHODS.length];
}
