export type Category = "om" | "ville" | "culture" | "mer";

export const CATEGORIES: Record<Category, { label: string; accent: "blue" | "violet" | "coral" | "teal" }> = {
  om: { label: "OM", accent: "blue" },
  ville: { label: "Ville", accent: "violet" },
  culture: { label: "Culture", accent: "coral" },
  mer: { label: "Mer & nature", accent: "teal" },
};

export type Media = { src: string; alt: string; credit?: string };

export type Story = {
  slug: string;
  title: string;
  category: Category;
  publishedAt: string;
  cover: Media;
  /** The three punchy beats told across the story viewer's slides. */
  points: [string, string, string];
  /** One short sentence of extra context, shown after the slides. */
  more: string;
};

export const stories: Story[] = [
  {
    slug: "mercato-a-larret",
    title: "Mercato à l'arrêt",
    category: "om",
    publishedAt: "2026-08-12",
    cover: {
      src: "/images/velodrome/interieur-marseille.jpg",
      alt: "Intérieur de l'Orange Vélodrome, tribunes avec l'inscription MARSEILLE",
      credit: "Randy110912 / Wikimedia Commons, CC BY-SA 4.0",
    },
    points: [
      "Seul club de Ligue 1 sans la moindre recrue depuis l'ouverture du mercato.",
      "Priorité du moment : dégraisser la masse salariale avant de recruter.",
      "Urgence absolue : trouver un gardien après le départ de Rulli.",
    ],
    more:
      "Après le départ de Gerónimo Rulli à Manchester City, l'OM doit conjuguer contraintes budgétaires et besoins sportifs avant la reprise de la Ligue 1.",
  },
  {
    slug: "rulli-manchester-city",
    title: "Rulli file à Manchester City",
    category: "om",
    publishedAt: "2026-08-11",
    cover: {
      src: "/images/velodrome/facade-orange-velodrome.jpg",
      alt: "Façade de l'Orange Vélodrome en plein jour",
      credit: "Bernard Ddd / Wikimedia Commons, CC BY-SA 2.0",
    },
    points: [
      "Deux saisons à Marseille, puis départ pour Manchester City.",
      "Un cadre du vestiaire qui tire sa révérence.",
      "La succession dans les buts s'ouvre à trois semaines de la reprise.",
    ],
    more:
      "Arrivé libre en 2024, le gardien argentin de 34 ans s'était imposé comme un pilier du vestiaire marseillais.",
  },
  {
    slug: "om-psg-koweit",
    title: "OM-PSG au Koweït",
    category: "om",
    publishedAt: "2026-08-10",
    cover: {
      src: "/images/velodrome/tribune-virage-sud.jpg",
      alt: "Tribune du virage Sud du Vélodrome un soir de match",
      credit: "Rémi Mathis / Wikimedia Commons, CC BY-SA 3.0",
    },
    points: [
      "Le Trophée des Champions s'exporte au Koweït cette année.",
      "Un premier test grandeur nature avant la Ligue 1.",
      "Le coup d'envoi symbolique d'une nouvelle saison.",
    ],
    more:
      "Comme les éditions précédentes, ce Trophée des Champions se joue loin du Vélodrome, sur une pelouse neutre du Golfe.",
  },
  {
    slug: "calendrier-2026-2027",
    title: "Le calendrier est sorti",
    category: "om",
    publishedAt: "2026-08-13",
    cover: {
      src: "/images/velodrome/interieur-marseille.jpg",
      alt: "Intérieur de l'Orange Vélodrome, tribunes avec l'inscription MARSEILLE",
      credit: "Randy110912 / Wikimedia Commons, CC BY-SA 4.0",
    },
    points: [
      "La Ligue de Football Professionnel a dévoilé le calendrier 2026-2027.",
      "Un enchaînement dense dès les premières journées.",
      "De quoi déjà cocher les rendez-vous à ne pas manquer.",
    ],
    more: "Le calendrier complet, journée par journée, est disponible sur le site officiel de la Ligue 1.",
  },
  {
    slug: "tramway-t3-nord-sud",
    title: "Le T3 relie enfin nord et sud",
    category: "ville",
    publishedAt: "2026-08-09",
    cover: {
      src: "/images/marseille/tramway.jpg",
      alt: "Station de tramway sur la Canebière, un jour d'été",
      credit: "Chabe01 / Wikimedia Commons, CC BY-SA 4.0",
    },
    points: [
      "Le tramway T3 s'étend désormais sur 9,8 km, contre 3,6 auparavant.",
      "Douze nouvelles stations, de Capitaine Gèze à La Gaye.",
      "Les quartiers nord et le centre-ville enfin reliés directement.",
    ],
    more:
      "L'extension a été inaugurée le 10 janvier 2026 par le ministre délégué aux Transports, Philippe Tabarot.",
  },
  {
    slug: "t3-vers-la-bricarde",
    title: "Le T3 file vers la Bricarde",
    category: "ville",
    publishedAt: "2026-08-07",
    cover: {
      src: "/images/marseille/tramway.jpg",
      alt: "Station de tramway sur la Canebière, un jour d'été",
      credit: "Chabe01 / Wikimedia Commons, CC BY-SA 4.0",
    },
    points: [
      "Une deuxième phase d'extension se précise au nord de la ville.",
      "Le tracé est rallongé d'environ 700 mètres supplémentaires.",
      "Objectif affiché : desservir le secteur de la Bricarde.",
    ],
    more: "La Métropole Aix-Marseille-Provence continue de faire évoluer le tracé de cette phase 2, encore à l'étude.",
  },
  {
    slug: "vieux-port-coeur-de-ville",
    title: "Le Vieux-Port, cœur battant",
    category: "ville",
    publishedAt: "2026-08-05",
    cover: {
      src: "/images/marseille/vieux-port.jpg",
      alt: "Vue panoramique du Vieux-Port de Marseille",
      credit: "Ingo Mehling / Wikimedia Commons, CC BY-SA 3.0",
    },
    points: [
      "Chaque matin, le marché aux poissons anime encore les quais.",
      "Yachts, pointus et ferries se partagent le même bassin.",
      "Le vrai centre de gravité de la ville, à toute heure.",
    ],
    more:
      "Du marché aux poissons matinal aux terrasses animées le soir, le Vieux-Port concentre à lui seul plusieurs vies de la ville.",
  },
  {
    slug: "bonnes-meres-mucem",
    title: "Bonnes Mères s'expose au Mucem",
    category: "culture",
    publishedAt: "2026-08-08",
    cover: {
      src: "/images/marseille/mucem.jpg",
      alt: "Façade du Mucem, sur le front de mer de Marseille",
      credit: "Houss 2020 / Wikimedia Commons, CC BY-SA 4.0",
    },
    points: [
      "Une exposition consacrée à la maternité en Méditerranée.",
      "Près de 350 œuvres, de l'Antiquité à aujourd'hui.",
      "À voir jusqu'au 31 août, au J4 et au fort Saint-Jean.",
    ],
    more:
      "Objets rituels, peintures, photographies et affiches militantes composent ce parcours consacré à l'expérience de la maternité.",
  },
  {
    slug: "bonne-mere-veille",
    title: "La Bonne Mère veille sur la ville",
    category: "culture",
    publishedAt: "2026-08-02",
    cover: {
      src: "/images/marseille/notre-dame-de-la-garde.jpg",
      alt: "La basilique Notre-Dame de la Garde et sa Vierge dorée",
      credit: "Kallerna / Wikimedia Commons, CC BY-SA 4.0",
    },
    points: [
      "Perchée à 154 mètres, la basilique domine tout Marseille.",
      "Sa Vierge dorée culmine à plus de 11 mètres de haut.",
      "Un repère visible depuis presque tous les quartiers.",
    ],
    more:
      "Lieu de pèlerinage autant que belvédère touristique, Notre-Dame de la Garde reste l'un des symboles les plus reconnaissables de la ville.",
  },
  {
    slug: "calanques-reservation-obligatoire",
    title: "Calanques : réservation obligatoire",
    category: "mer",
    publishedAt: "2026-08-06",
    cover: {
      src: "/images/marseille/calanques.jpg",
      alt: "Une calanque aux eaux turquoise près de Marseille",
      credit: "Georges Seguin / Wikimedia Commons, CC BY-SA 3.0",
    },
    points: [
      "Réservation gratuite obligatoire tous les jours jusqu'au 30 août.",
      "Quota fixé à 400 visiteurs par jour sur les sites les plus prisés.",
      "Objectif affiché : préserver des massifs fragilisés par leur succès.",
    ],
    more: "Le dispositif s'applique en particulier aux calanques les plus fréquentées, comme Sugiton, pour limiter la surfréquentation estivale.",
  },
  {
    slug: "calanques-code-couleur-incendie",
    title: "Le code couleur des calanques",
    category: "mer",
    publishedAt: "2026-08-04",
    cover: {
      src: "/images/marseille/calanques.jpg",
      alt: "Une calanque aux eaux turquoise près de Marseille",
      credit: "Georges Seguin / Wikimedia Commons, CC BY-SA 3.0",
    },
    points: [
      "Quatre niveaux de risque incendie : vert, jaune, orange, rouge.",
      "En orange, les sentiers ferment mais la mer reste accessible.",
      "En rouge, tout accès est interdit — même en bateau.",
    ],
    more:
      "Le massif des Calanques peut être fermé du jour au lendemain selon les conditions météo, indépendamment du système de réservation.",
  },
];

export function getStory(slug: string): Story | undefined {
  return stories.find((s) => s.slug === slug);
}

export function getAllStoriesDesc(): Story[] {
  return [...stories].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

export function getStoriesByCategory(category: Category): Story[] {
  return getAllStoriesDesc().filter((s) => s.category === category);
}

export function getAdjacentStories(story: Story): { prev?: Story; next?: Story } {
  const all = getAllStoriesDesc();
  const i = all.findIndex((s) => s.slug === story.slug);
  return { prev: all[i + 1], next: all[i - 1] };
}
