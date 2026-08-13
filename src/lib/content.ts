import type { IllustrationKey } from "@/components/illustrations";
import { isoWeekId } from "@/lib/date";

export type Category = "mercato" | "match" | "vestiaire" | "video";

export const CATEGORIES: Record<Category, { label: string; short: string }> = {
  mercato: { label: "Mercato", short: "Mercato" },
  match: { label: "Match & Terrain", short: "Match" },
  vestiaire: { label: "Vestiaire & Coulisses", short: "Coulisses" },
  video: { label: "Images & Vidéos", short: "Vidéos" },
};

export type Media =
  | { kind: "illustration"; key: IllustrationKey }
  | { kind: "image"; src: string; alt: string; credit?: string }
  | {
      kind: "video";
      poster: IllustrationKey | { src: string; alt: string; credit?: string };
      caption: string;
      src?: string;
    };

export type Article = {
  slug: string;
  title: string;
  dek: string;
  category: Category;
  /** ISO date, e.g. "2026-08-13". The weekly edition is derived from this. */
  publishedAt: string;
  readMinutes: number;
  points: [string, string, string];
  body: string[];
  media: Media;
  tags: string[];
  featured?: boolean;
};

export function weekIdOf(article: Pick<Article, "publishedAt">): string {
  return isoWeekId(new Date(`${article.publishedAt}T00:00:00Z`));
}

export const articles: Article[] = [
  {
    slug: "mercato-om-toujours-a-larret",
    title: "Un mercato à l'arrêt : l'OM toujours sans recrue mi-août",
    dek: "Seul club de Ligue 1 à ne pas avoir enregistré la moindre arrivée, Marseille joue la montre entre contraintes financières et dossiers en attente.",
    category: "mercato",
    publishedAt: "2026-08-12",
    readMinutes: 3,
    points: [
      "Début août, l'OM restait le seul club de Ligue 1 — avec l'Athletic Bilbao parmi les cinq grands championnats — à n'avoir officialisé aucune arrivée depuis l'ouverture du mercato.",
      "Le club doit d'abord alléger sa masse salariale : plusieurs départs de gros contrats sont priorisés avant toute nouvelle signature.",
      "Le dossier le plus urgent concerne le poste de gardien, laissé vacant par un départ majeur, avec plusieurs pistes explorées en défense et au milieu.",
    ],
    body: [
      "À une poignée de jours de la reprise de la Ligue 1, la Commanderie tourne au ralenti côté arrivées. La direction sportive assume une stratégie prudente, contrainte par les équilibres financiers du club, et privilégie les départs avant de dégainer sur le marché.",
      "Plusieurs profils sont annoncés en défense centrale et au milieu de terrain, sans qu'aucun accord ne soit encore acté publiquement. Le club dispose encore de plusieurs semaines avant la fermeture du marché pour boucler ses dossiers prioritaires.",
      "Reste une urgence : trouver un numéro un pour remplacer le gardien parti à Manchester City, un chantier qui occupe une bonne partie des discussions internes ces derniers jours.",
    ],
    media: {
      kind: "image",
      src: "/images/velodrome/interieur-marseille.jpg",
      alt: "Intérieur de l'Orange Vélodrome, tribunes vides avec l'inscription MARSEILLE",
      credit: "Randy110912 / Wikimedia Commons, CC BY-SA 4.0",
    },
    tags: ["mercato", "recrutement", "masse salariale"],
    featured: true,
  },
  {
    slug: "rulli-quitte-om-manchester-city",
    title: "Départ acté : Rulli s'envole pour Manchester City",
    dek: "Deux saisons après son arrivée, le gardien argentin quitte l'OM et referme un chapitre important du vestiaire phocéen.",
    category: "vestiaire",
    publishedAt: "2026-08-11",
    readMinutes: 2,
    points: [
      "Gerónimo Rulli, 34 ans, quitte officiellement l'Olympique de Marseille pour rejoindre Manchester City.",
      "Le portier argentin laisse un vide dans la hiérarchie des gardiens après deux saisons passées à Marseille.",
      "Son transfert relance en urgence la recherche d'un nouveau numéro un avant le coup d'envoi de la saison.",
    ],
    body: [
      "C'est un cadre du vestiaire qui s'en va. Arrivé libre il y a deux ans, Gerónimo Rulli avait fini par s'imposer comme une valeur sûre entre les perches marseillaises, au point de devenir l'un des points d'ancrage du groupe.",
      "Son départ vers Manchester City, validé cet été, illustre aussi la logique de dégraissage financier voulue par la direction. Il laisse derrière lui un poste stratégique à pourvoir en quelques semaines à peine avant la reprise du championnat.",
    ],
    media: { kind: "illustration", key: "jersey" },
    tags: ["vestiaire", "gardien", "transfert"],
  },
  {
    slug: "trophee-des-champions-koweit-psg-om",
    title: "Cap sur le Koweït : l'OM ouvre sa saison face au PSG",
    dek: "Le traditionnel Trophée des Champions délocalisé dans le Golfe donne le coup d'envoi symbolique de la saison marseillaise.",
    category: "match",
    publishedAt: "2026-08-10",
    readMinutes: 3,
    points: [
      "Le Trophée des Champions 2026 opposant le PSG à l'OM se dispute au Koweït, confirmant la tournée internationale de la compétition.",
      "Cette affiche sert de match de lancement à une saison où l'OM veut confirmer sa place de dauphin de la Ligue 1.",
      "Le déplacement dans le Golfe s'accompagne d'un programme promotionnel pour le club, entre séance ouverte aux supporters locaux et opérations marketing.",
    ],
    body: [
      "Avant même le premier coup de sifflet de Ligue 1, l'OM entre en scène sur une pelouse neutre, à des milliers de kilomètres du Vélodrome. Le Trophée des Champions, désormais habitué aux organisations à l'étranger, fait escale au Koweït pour cette nouvelle édition face au rival parisien.",
      "Sur le papier, la rencontre n'attribue qu'un trophée honorifique. Dans les faits, elle sert de test grandeur nature pour un groupe encore en construction, à quelques jours de la première journée de championnat.",
    ],
    media: {
      kind: "video",
      poster: { src: "photo-1522778119026-d647f0596c20", alt: "Stade plein à craquer sous les lumières, ambiance de grand soir" },
      caption: "Résumé vidéo à intégrer : ambiance et arrivée du groupe au Koweït.",
    },
    tags: ["trophée des champions", "psg", "calendrier"],
    featured: true,
  },
  {
    slug: "calendrier-ligue-1-2026-2027-devoile",
    title: "Le calendrier 2026-2027 dévoilé : un menu corsé pour l'OM",
    dek: "La Ligue de Football Professionnel a publié le calendrier de la saison : entrée en matière et enchaînements à surveiller pour les Marseillais.",
    category: "match",
    publishedAt: "2026-08-13",
    readMinutes: 2,
    points: [
      "Le calendrier complet de la saison 2026-2027 de Ligue 1 a été officiellement dévoilé cette semaine.",
      "L'OM découvre son enchaînement de matchs pour les premières journées, entre déplacements sensibles et réceptions au Vélodrome.",
      "Les supporters peuvent d'ores et déjà repérer les rendez-vous à ne pas manquer sur la première partie de saison.",
    ],
    body: [
      "Chaque mois d'août, le même rituel : la publication du calendrier officiel relance les discussions sur les temps forts de la saison à venir. Pour l'OM, l'exercice 2026-2027 s'annonce dense, avec son lot de rendez-vous à forte intensité dès les premières semaines.",
      "Au-delà du seul calendrier de championnat, le club devra aussi composer avec ses engagements européens et coupes nationales, un enchaînement qui pèsera vite dans la gestion de l'effectif.",
    ],
    media: { kind: "illustration", key: "calendar" },
    tags: ["calendrier", "ligue 1"],
  },
  {
    slug: "commanderie-images-reprise",
    title: "Retour à la Commanderie : les premières images de la reprise",
    dek: "Entre gammes physiques et ateliers tactiques, le groupe professionnel a repris le chemin de l'entraînement sous le soleil marseillais.",
    category: "video",
    publishedAt: "2026-08-13",
    readMinutes: 2,
    points: [
      "Le groupe professionnel a repris l'entraînement à la Commanderie avec un programme axé sur le physique et le collectif.",
      "Les jeunes du centre de formation intégrés au groupe pro profitent de cette période pour se montrer aux yeux du staff.",
      "Les premières séances ouvertes ont permis aux observateurs de noter les automatismes déjà en place avant les matchs de préparation.",
    ],
    body: [
      "Ballons au sol, ateliers de vitesse et travail tactique par séquences : la reprise à la Commanderie a suivi le format classique d'une préparation estivale, avec une montée en charge progressive sur les premiers jours.",
      "Quelques jeunes talents du centre de formation ont été conviés à s'entraîner avec le groupe professionnel, une occasion pour eux de se montrer avant les premières coupes d'effectif.",
    ],
    media: {
      kind: "video",
      poster: { src: "photo-1517466787929-bc90951d0974", alt: "Joueur en pleine frappe sur un terrain d'entraînement" },
      caption: "Vidéo à intégrer : mosaïque des ateliers du jour à la Commanderie.",
    },
    tags: ["entraînement", "commanderie", "vidéo"],
  },
  {
    slug: "apres-de-zerbi-nouveau-cycle",
    title: "Après De Zerbi : la Commanderie referme un chapitre agité",
    dek: "Six mois après la rupture avec l'entraîneur italien, retour sur une page tumultueuse avant d'aborder la nouvelle saison sur des bases stabilisées.",
    category: "vestiaire",
    publishedAt: "2026-08-06",
    readMinutes: 3,
    points: [
      "La rupture avec Roberto De Zerbi, actée en plein hiver après une lourde défaite face au PSG, a marqué la fin d'un cycle court et contrasté.",
      "Le club a depuis travaillé à stabiliser son organisation sportive pour aborder la nouvelle saison sur des bases plus sereines.",
      "La préparation estivale sert aussi à ressouder un vestiaire fragilisé par plusieurs mois d'instabilité.",
    ],
    body: [
      "Il aura fallu une soirée particulièrement douloureuse à Paris pour précipiter la fin. Le split avec Roberto De Zerbi, au cœur de l'hiver, avait alors surpris par sa soudaineté autant que par son timing.",
      "Six mois plus tard, à l'heure de la reprise, le club affiche la volonté de tourner la page sans en effacer les leçons : un vestiaire plus solidaire, une organisation clarifiée et une préparation estivale pensée comme un nouveau départ.",
    ],
    media: { kind: "illustration", key: "press" },
    tags: ["coaching staff", "vestiaire", "rétrospective"],
  },
  {
    slug: "amicaux-ete-onze-type",
    title: "Amicaux d'été : les contours du onze type se précisent",
    dek: "Au fil des matchs de préparation, le staff affine ses certitudes avant la première journée de Ligue 1.",
    category: "match",
    publishedAt: "2026-08-05",
    readMinutes: 3,
    points: [
      "Les matchs amicaux estivaux ont permis de tester plusieurs schémas tactiques face à des adversaires de niveaux variés.",
      "Certains cadres de la saison passée confirment leur statut, pendant que de nouveaux profils tentent de se faire une place.",
      "Le onze de départ pour la première journée reste encore ouvert, entre choix tactiques et dernières arrivées attendues.",
    ],
    body: [
      "Comme chaque été, les matchs de préparation servent avant tout de laboratoire. Plusieurs organisations ont été testées ces dernières semaines, entre système à quatre défenseurs et variantes à trois axiaux.",
      "Si l'ossature de l'équipe semble se dessiner autour des cadres habituels, la concurrence reste vive à plusieurs postes, notamment sur les ailes et devant la défense.",
    ],
    media: { kind: "image", src: "photo-1431324155629-1a6deb1dec8d", alt: "Match nocturne dans le brouillard, ambiance intense sur la pelouse" },
    tags: ["préparation", "tactique", "amicaux"],
  },
  {
    slug: "ventes-prioritaires-masse-salariale",
    title: "Dégraisser avant de recruter : la priorité assumée de la direction",
    dek: "Pour respecter ses contraintes budgétaires, l'OM concentre ses efforts sur les départs de gros salaires avant d'activer de nouvelles pistes.",
    category: "mercato",
    publishedAt: "2026-08-04",
    readMinutes: 2,
    points: [
      "La direction sportive a fait des départs de joueurs à fort salaire une priorité absolue de ce mercato estival.",
      "Cette stratégie explique en partie la lenteur du club sur le volet des arrivées depuis l'ouverture du marché.",
      "Plusieurs dossiers de départ seraient en discussion avancée, sans qu'aucun ne soit encore officialisé.",
    ],
    body: [
      "Derrière la lenteur apparente du mercato marseillais se cache une équation budgétaire assumée par la direction : impossible de recruter sereinement sans d'abord alléger une masse salariale sous contrainte.",
      "Plusieurs joueurs figurant parmi les plus gros contrats du club seraient concernés par ces discussions, dans l'optique de dégager la marge de manœuvre nécessaire aux arrivées jugées prioritaires.",
    ],
    media: { kind: "illustration", key: "transfer" },
    tags: ["mercato", "budget", "départs"],
  },
  {
    slug: "velodrome-coulisses-preparation",
    title: "Dans les coulisses du Vélodrome avant la reprise",
    dek: "Pelouse, tribunes, logistique : plongée dans les préparatifs du stade avant le retour de la Ligue 1 sous les yeux du public.",
    category: "video",
    publishedAt: "2026-08-03",
    readMinutes: 2,
    points: [
      "Les équipes du stade multiplient les opérations d'entretien de la pelouse avant la reprise de la compétition.",
      "La billetterie et les services aux abonnés s'organisent en amont du premier match à domicile de la saison.",
      "Ces coulisses logistiques restent peu visibles du grand public mais conditionnent le bon déroulement des soirées de match.",
    ],
    body: [
      "Loin des projecteurs braqués sur le mercato, une autre course contre la montre se joue au Vélodrome : celle de la préparation du stade. Tonte, resemis, arrosage millimétré, la pelouse fait l'objet d'une attention constante avant la reprise.",
      "En parallèle, les équipes billetterie et accueil peaufinent l'organisation logistique des soirées de match, pour que la première réception de la saison se déroule sans accroc.",
    ],
    media: {
      kind: "video",
      poster: {
        src: "/images/velodrome/facade-orange-velodrome.jpg",
        alt: "Façade de l'Orange Vélodrome et son parvis, en plein jour",
        credit: "Bernard Ddd / Wikimedia Commons, CC BY-SA 2.0",
      },
      caption: "Vidéo à intégrer : la tournée des coulisses du stade avant match.",
    },
    tags: ["vélodrome", "coulisses", "logistique"],
  },
];

export function getArticle(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug);
}

export function getArticlesByWeek(weekId: string): Article[] {
  return articles
    .filter((a) => weekIdOf(a) === weekId)
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

export function getAllWeeksDesc(): string[] {
  const set = new Set(articles.map((a) => weekIdOf(a)));
  return Array.from(set).sort().reverse();
}

/** Most recent edition with published content — the "current" issue, whether or not it lines up with today's calendar week. */
export function getLatestWeekId(): string {
  return getAllWeeksDesc()[0];
}

export function getFeatured(weekId: string): Article {
  const weekArticles = getArticlesByWeek(weekId);
  return weekArticles.find((a) => a.featured) ?? weekArticles[0] ?? articles[0];
}

export function getArticlesByCategory(category: Category, excludeSlug?: string, limit?: number): Article[] {
  const list = articles
    .filter((a) => a.category === category && a.slug !== excludeSlug)
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
  return limit ? list.slice(0, limit) : list;
}

export function getRelated(article: Article, limit = 3): Article[] {
  return articles
    .filter((a) => a.slug !== article.slug && a.category === article.category)
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
    .slice(0, limit);
}

export function getLatestArticles(limit = 6): Article[] {
  return [...articles].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1)).slice(0, limit);
}

export function getAllTags(): string[] {
  const set = new Set(articles.flatMap((a) => a.tags));
  return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
}

export function getArticlesByTag(tag: string): Article[] {
  return articles
    .filter((a) => a.tags.includes(tag))
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}
