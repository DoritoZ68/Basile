export type CategoryKey = "ia" | "business" | "marketing" | "tech";

export type Level = "Débutant" | "Intermédiaire" | "Avancé";

export type IconName =
  | "spark"
  | "bot"
  | "code"
  | "briefcase"
  | "cart"
  | "package"
  | "chart-up"
  | "linkedin"
  | "pen"
  | "video"
  | "search"
  | "database"
  | "shield"
  | "layout";

export type Module = {
  title: string;
  lessons: number;
  /** Durée totale du module, en minutes. */
  minutes: number;
};

export type Course = {
  slug: string;
  title: string;
  subtitle: string;
  category: CategoryKey;
  level: Level;
  /** Prix TTC en euros. */
  price: number;
  icon: IconName;
  /** Ordre d'affichage "Populaires" : plus petit = plus haut. */
  rank: number;
  badge?: "Best-seller" | "Nouveau" | "Tendance";
  updated: string;
  description: string;
  outcomes: string[];
  audience: string[];
  prerequisites: string;
  tools: string[];
  project: string;
  modules: Module[];
};

export type Pack = {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  price: number;
  icon: IconName;
  courses: string[];
  highlight?: boolean;
};

export const CATEGORIES: Record<CategoryKey, { label: string; short: string; description: string }> = {
  ia: {
    label: "IA & Automatisation",
    short: "IA",
    description: "Prompting, agents, automatisations et apps construites avec l'IA.",
  },
  business: {
    label: "Business en ligne",
    short: "Business",
    description: "Freelance, e-commerce, produits numériques et gestion de son argent.",
  },
  marketing: {
    label: "Marketing & Contenu",
    short: "Marketing",
    description: "Personal branding, copywriting, vidéo courte et visibilité Google/IA.",
  },
  tech: {
    label: "Tech & Data",
    short: "Tech",
    description: "Data analyse, cybersécurité et design d'interfaces.",
  },
};

export const CATEGORY_ORDER: CategoryKey[] = ["ia", "business", "marketing", "tech"];

export const courses: Course[] = [
  {
    slug: "ia-generative-au-quotidien",
    title: "Maîtriser l'IA générative au quotidien",
    subtitle: "ChatGPT, Claude, Gemini : gagner 5 à 10 heures par semaine dès le premier mois.",
    category: "ia",
    level: "Débutant",
    price: 297,
    icon: "spark",
    rank: 1,
    badge: "Best-seller",
    updated: "2026-09",
    description:
      "La formation de référence pour passer de « je teste ChatGPT de temps en temps » à « l'IA fait partie de chacune de mes journées ». On apprend à bien formuler ses demandes, à construire ses propres assistants et à intégrer l'IA dans ses outils de tous les jours, sans jargon technique.",
    outcomes: [
      "Rédiger des prompts structurés qui donnent un résultat exploitable du premier coup",
      "Choisir le bon modèle selon la tâche : rédaction, analyse, recherche, image",
      "Créer des assistants personnalisés (GPTs, Projects, Gems) pour vos tâches récurrentes",
      "Analyser des PDF, tableurs et réunions en quelques minutes",
      "Utiliser l'IA en respectant la confidentialité de vos données et le RGPD",
    ],
    audience: [
      "Salariés et managers qui veulent gagner du temps",
      "Indépendants qui gèrent tout seuls leur activité",
      "Étudiants et personnes en reconversion",
    ],
    prerequisites: "Aucun. Savoir utiliser un navigateur suffit.",
    tools: ["ChatGPT", "Claude", "Gemini", "Perplexity", "NotebookLM"],
    project: "Votre « boîte à outils IA » : 10 assistants prêts à l'emploi pour votre métier.",
    modules: [
      { title: "Comprendre comment pensent les modèles", lessons: 5, minutes: 55 },
      { title: "La méthode de prompt en 5 blocs", lessons: 7, minutes: 80 },
      { title: "Rédaction, synthèse et emails", lessons: 6, minutes: 70 },
      { title: "Analyser documents, données et réunions", lessons: 6, minutes: 75 },
      { title: "Créer ses assistants personnalisés", lessons: 5, minutes: 65 },
      { title: "Images, voix et présentations", lessons: 4, minutes: 45 },
      { title: "Confidentialité, limites et bonnes pratiques", lessons: 3, minutes: 30 },
    ],
  },
  {
    slug: "agents-ia-automatisation",
    title: "Agents IA & automatisation avec n8n et Make",
    subtitle: "Automatiser les tâches répétitives et brancher l'IA sur tous vos outils.",
    category: "ia",
    level: "Intermédiaire",
    price: 397,
    icon: "bot",
    rank: 3,
    badge: "Tendance",
    updated: "2026-09",
    description:
      "Les agents IA sont la compétence la plus recherchée du moment. Vous apprenez à construire des workflows qui travaillent à votre place : tri des emails, qualification de prospects, génération de devis, veille automatique, support client. Chaque module se termine par une automatisation que vous pouvez réutiliser telle quelle.",
    outcomes: [
      "Construire des workflows complets sur n8n et Make, sans coder",
      "Connecter Gmail, Notion, Google Sheets, Slack, un CRM et des API",
      "Créer des agents IA capables d'utiliser des outils et de prendre des décisions",
      "Mettre en place une base de connaissances (RAG) pour répondre avec vos propres documents",
      "Vendre l'automatisation comme service à des entreprises",
    ],
    audience: [
      "Indépendants et TPE qui veulent déléguer l'administratif",
      "Profils ops, marketing ou support",
      "Freelances qui veulent proposer une offre d'automatisation",
    ],
    prerequisites: "Être à l'aise avec l'IA générative (ou avoir suivi la formation dédiée).",
    tools: ["n8n", "Make", "Zapier", "API OpenAI / Anthropic", "Notion", "Airtable"],
    project: "Un agent de prospection qui trouve, qualifie et contacte des leads tout seul.",
    modules: [
      { title: "Penser en workflows : déclencheurs, actions, données", lessons: 5, minutes: 60 },
      { title: "Prise en main de Make", lessons: 6, minutes: 85 },
      { title: "Prise en main de n8n (cloud et auto-hébergé)", lessons: 6, minutes: 90 },
      { title: "Brancher l'IA dans ses automatisations", lessons: 7, minutes: 95 },
      { title: "Agents IA : outils, mémoire et décisions", lessons: 7, minutes: 110 },
      { title: "RAG : faire parler vos documents", lessons: 5, minutes: 70 },
      { title: "10 automatisations clés en main", lessons: 10, minutes: 120 },
      { title: "Vendre ses automatisations", lessons: 4, minutes: 50 },
    ],
  },
  {
    slug: "creer-des-apps-avec-l-ia",
    title: "Créer des apps avec l'IA (vibe coding)",
    subtitle: "De l'idée à l'application en ligne, en décrivant ce que vous voulez.",
    category: "ia",
    level: "Débutant",
    price: 347,
    icon: "code",
    rank: 4,
    badge: "Nouveau",
    updated: "2026-10",
    description:
      "Les assistants de code permettent aujourd'hui de construire de vraies applications sans être développeur. Cette formation vous apprend à piloter ces outils avec méthode : cadrer son idée, faire générer le code, le tester, corriger les bugs, ajouter une base de données et des paiements, puis mettre en ligne.",
    outcomes: [
      "Transformer une idée en cahier des charges que l'IA comprend",
      "Construire un site ou une app web avec Lovable, Bolt, Cursor ou Claude Code",
      "Ajouter comptes utilisateurs, base de données et paiements Stripe",
      "Déboguer avec l'IA plutôt que de rester bloqué",
      "Déployer en ligne avec un nom de domaine",
    ],
    audience: [
      "Entrepreneurs qui veulent tester une idée sans recruter",
      "Créateurs qui veulent leurs propres outils",
      "Curieux qui veulent comprendre le développement moderne",
    ],
    prerequisites: "Aucun prérequis en programmation.",
    tools: ["Lovable", "Bolt", "Cursor", "Claude Code", "Supabase", "Stripe", "Vercel"],
    project: "Un micro-SaaS en ligne avec inscription, base de données et paiement.",
    modules: [
      { title: "Les bases du web en 45 minutes", lessons: 4, minutes: 45 },
      { title: "Cadrer son idée et rédiger le brief", lessons: 4, minutes: 50 },
      { title: "Premier prototype avec Lovable / Bolt", lessons: 6, minutes: 80 },
      { title: "Passer à Cursor et Claude Code", lessons: 7, minutes: 100 },
      { title: "Base de données et authentification", lessons: 6, minutes: 85 },
      { title: "Paiements avec Stripe", lessons: 4, minutes: 55 },
      { title: "Tester, déboguer, sécuriser", lessons: 5, minutes: 65 },
      { title: "Mise en ligne et nom de domaine", lessons: 3, minutes: 35 },
    ],
  },
  {
    slug: "lancer-son-activite-freelance",
    title: "Lancer son activité freelance",
    subtitle: "Statut, offre, prix et premiers clients en 60 jours.",
    category: "business",
    level: "Débutant",
    price: 197,
    icon: "briefcase",
    rank: 5,
    updated: "2026-08",
    description:
      "Tout ce qu'il faut pour se lancer à son compte sereinement en France : choisir son statut, construire une offre claire, fixer ses tarifs, trouver ses premiers clients et gérer l'administratif sans y passer ses soirées.",
    outcomes: [
      "Choisir entre micro-entreprise, EURL et SASU selon votre situation",
      "Formuler une offre claire qui se distingue de la concurrence",
      "Calculer un TJM rentable, charges et congés compris",
      "Trouver des clients via LinkedIn, Malt, le réseau et la prospection directe",
      "Rédiger devis, factures et CGV conformes",
    ],
    audience: [
      "Salariés qui préparent leur départ",
      "Personnes en reconversion",
      "Freelances débutants qui manquent de clients",
    ],
    prerequisites: "Avoir une compétence à vendre (design, dev, rédaction, conseil…).",
    tools: ["Malt", "LinkedIn", "Notion", "Indy / Abby", "Google Workspace"],
    project: "Votre plan de lancement : offre, grille tarifaire et 30 prospects qualifiés.",
    modules: [
      { title: "Le bon statut juridique et fiscal", lessons: 5, minutes: 60 },
      { title: "Construire son offre", lessons: 4, minutes: 50 },
      { title: "Fixer ses prix", lessons: 4, minutes: 45 },
      { title: "Trouver ses premiers clients", lessons: 7, minutes: 90 },
      { title: "Devis, contrats et facturation", lessons: 5, minutes: 55 },
      { title: "S'organiser et durer", lessons: 4, minutes: 40 },
    ],
  },
  {
    slug: "e-commerce-shopify",
    title: "E-commerce : lancer sa boutique Shopify",
    subtitle: "Trouver le bon produit, créer la boutique et faire ses premières ventes.",
    category: "business",
    level: "Débutant",
    price: 297,
    icon: "cart",
    rank: 8,
    updated: "2026-07",
    description:
      "Une méthode complète pour lancer une boutique en ligne rentable : étude de marché, sourcing (stock, dropshipping ou print-on-demand), création d'une boutique Shopify qui convertit, et acquisition via Meta Ads, TikTok et le SEO.",
    outcomes: [
      "Valider un produit avant d'investir dans du stock",
      "Créer une boutique Shopify professionnelle en un week-end",
      "Rédiger des fiches produits et pages de vente qui convertissent",
      "Lancer ses premières campagnes Meta Ads et TikTok Ads",
      "Lire ses chiffres : marge, panier moyen, coût d'acquisition",
    ],
    audience: [
      "Porteurs de projet e-commerce",
      "Artisans et créateurs qui veulent vendre en ligne",
      "Commerçants qui veulent un second canal de vente",
    ],
    prerequisites: "Aucun. Prévoir un petit budget de test publicitaire.",
    tools: ["Shopify", "Meta Ads", "TikTok Ads", "Canva", "Google Analytics"],
    project: "Une boutique en ligne prête à vendre avec sa première campagne publicitaire.",
    modules: [
      { title: "Choisir son modèle et son produit", lessons: 5, minutes: 65 },
      { title: "Sourcing et fournisseurs", lessons: 4, minutes: 50 },
      { title: "Construire la boutique Shopify", lessons: 7, minutes: 95 },
      { title: "Pages produits qui convertissent", lessons: 4, minutes: 50 },
      { title: "Publicité Meta et TikTok", lessons: 7, minutes: 100 },
      { title: "Email, fidélisation et chiffres clés", lessons: 5, minutes: 60 },
    ],
  },
  {
    slug: "creer-et-vendre-son-produit-numerique",
    title: "Créer et vendre son produit numérique",
    subtitle: "Formation en ligne, ebook, templates : transformer son savoir en revenus.",
    category: "business",
    level: "Intermédiaire",
    price: 247,
    icon: "package",
    rank: 6,
    updated: "2026-09",
    description:
      "Les produits numériques se créent une fois et se vendent à l'infini. Vous apprenez à choisir un sujet qui se vend, à produire votre contenu efficacement (avec l'aide de l'IA), à construire votre tunnel de vente et à lancer avec une audience même modeste.",
    outcomes: [
      "Trouver un sujet rentable à partir de vos compétences",
      "Valider la demande avec une prévente avant de tout produire",
      "Produire vidéos, PDF ou templates rapidement",
      "Construire une page de vente et un tunnel email automatisé",
      "Organiser un lancement et fixer le bon prix",
    ],
    audience: [
      "Experts et consultants qui veulent des revenus passifs",
      "Créateurs de contenu avec une audience",
      "Formateurs qui veulent passer en ligne",
    ],
    prerequisites: "Avoir une expertise, même de niche.",
    tools: ["Systeme.io", "Podia", "Gumroad", "Canva", "Notion", "Loom"],
    project: "Votre produit en prévente avec page de vente et séquence email de lancement.",
    modules: [
      { title: "Trouver le bon produit", lessons: 5, minutes: 55 },
      { title: "Valider avant de produire", lessons: 4, minutes: 45 },
      { title: "Produire vite et bien", lessons: 6, minutes: 80 },
      { title: "Plateformes et tunnel de vente", lessons: 6, minutes: 75 },
      { title: "Prix, offres et bonus", lessons: 3, minutes: 35 },
      { title: "Le lancement", lessons: 5, minutes: 60 },
    ],
  },
  {
    slug: "investir-en-bourse",
    title: "Investir en bourse : ETF, PEA et assurance-vie",
    subtitle: "Construire un patrimoine simplement, sans y passer ses week-ends.",
    category: "business",
    level: "Débutant",
    price: 197,
    icon: "chart-up",
    rank: 9,
    updated: "2026-09",
    description:
      "Une formation pédagogique pour comprendre les placements accessibles en France et mettre en place une stratégie d'investissement passive, diversifiée et adaptée à votre profil. Contenu éducatif : aucun conseil en investissement personnalisé.",
    outcomes: [
      "Comprendre actions, obligations, ETF et intérêts composés",
      "Choisir entre PEA, compte-titres, assurance-vie et PER",
      "Construire un portefeuille ETF diversifié et peu coûteux",
      "Mettre en place un investissement programmé",
      "Éviter les erreurs classiques et les arnaques",
    ],
    audience: [
      "Débutants qui ont de l'épargne qui dort",
      "Jeunes actifs qui veulent commencer tôt",
      "Indépendants qui préparent leur retraite",
    ],
    prerequisites: "Aucun.",
    tools: ["Simulateurs", "Justetf", "Tableur de suivi fourni"],
    project: "Votre plan d'investissement personnel et votre tableau de suivi.",
    modules: [
      { title: "Les bases de l'investissement", lessons: 5, minutes: 55 },
      { title: "Les enveloppes fiscales françaises", lessons: 5, minutes: 60 },
      { title: "Les ETF en pratique", lessons: 5, minutes: 60 },
      { title: "Construire son portefeuille", lessons: 4, minutes: 50 },
      { title: "Psychologie et erreurs à éviter", lessons: 4, minutes: 40 },
    ],
  },
  {
    slug: "personal-branding-linkedin",
    title: "Personal branding sur LinkedIn",
    subtitle: "Devenir la référence de son domaine et attirer clients et recruteurs.",
    category: "marketing",
    level: "Débutant",
    price: 147,
    icon: "linkedin",
    rank: 2,
    badge: "Best-seller",
    updated: "2026-09",
    description:
      "LinkedIn reste le premier canal pour se faire connaître en B2B. Vous apprenez à optimiser votre profil, à trouver votre ligne éditoriale, à écrire des posts qui génèrent de l'engagement et à transformer cette visibilité en opportunités concrètes.",
    outcomes: [
      "Optimiser son profil pour être trouvé et contacté",
      "Définir une ligne éditoriale tenable sur la durée",
      "Écrire des posts qui accrochent dès la première ligne",
      "Utiliser l'IA pour produire sans perdre sa voix",
      "Convertir l'audience en rendez-vous et en clients",
    ],
    audience: ["Indépendants et consultants", "Dirigeants de TPE/PME", "Salariés en recherche d'opportunités"],
    prerequisites: "Avoir un compte LinkedIn.",
    tools: ["LinkedIn", "Canva", "Notion", "Assistants IA"],
    project: "Un profil optimisé et 30 jours de posts planifiés.",
    modules: [
      { title: "Un profil qui travaille pour vous", lessons: 4, minutes: 40 },
      { title: "Positionnement et ligne éditoriale", lessons: 4, minutes: 45 },
      { title: "Écrire des posts qui performent", lessons: 6, minutes: 70 },
      { title: "Carrousels, vidéos et formats", lessons: 4, minutes: 45 },
      { title: "De la visibilité aux clients", lessons: 4, minutes: 45 },
    ],
  },
  {
    slug: "copywriting-qui-convertit",
    title: "Copywriting qui convertit",
    subtitle: "Écrire des pages de vente, emails et pubs qui donnent envie d'acheter.",
    category: "marketing",
    level: "Intermédiaire",
    price: 197,
    icon: "pen",
    rank: 7,
    updated: "2026-08",
    description:
      "Le copywriting est la compétence qui démultiplie toutes les autres : une même offre peut vendre dix fois plus avec les bons mots. Méthodes éprouvées (AIDA, PAS, storytelling), étude de cas réels et exercices corrigés.",
    outcomes: [
      "Comprendre les leviers psychologiques de la décision d'achat",
      "Maîtriser les structures AIDA, PAS et la page de vente longue",
      "Écrire des titres et accroches qui captent l'attention",
      "Rédiger des séquences email qui vendent sans forcer",
      "Utiliser l'IA comme assistant de rédaction, pas comme remplaçant",
    ],
    audience: ["Entrepreneurs qui rédigent leurs propres pages", "Marketeurs et community managers", "Rédacteurs freelances"],
    prerequisites: "Aucun.",
    tools: ["Google Docs", "Assistants IA", "Hemingway", "Bibliothèque de swipe files fournie"],
    project: "Une page de vente complète et une séquence de 5 emails pour votre offre.",
    modules: [
      { title: "Psychologie de l'acheteur", lessons: 4, minutes: 45 },
      { title: "Titres et accroches", lessons: 5, minutes: 50 },
      { title: "Les grandes structures", lessons: 5, minutes: 60 },
      { title: "La page de vente", lessons: 6, minutes: 75 },
      { title: "Emails qui vendent", lessons: 5, minutes: 55 },
      { title: "Publicités et réseaux sociaux", lessons: 3, minutes: 35 },
    ],
  },
  {
    slug: "video-courte-tiktok-reels",
    title: "Vidéo courte : TikTok, Reels et Shorts",
    subtitle: "Scripter, tourner au smartphone et monter des vidéos qui retiennent.",
    category: "marketing",
    level: "Débutant",
    price: 197,
    icon: "video",
    rank: 10,
    badge: "Tendance",
    updated: "2026-09",
    description:
      "La vidéo courte est devenue le format roi de l'attention. Apprenez à écrire des scripts qui retiennent jusqu'à la fin, à tourner proprement avec votre téléphone et à monter rapidement sur CapCut, pour votre marque ou pour proposer du contenu UGC aux marques.",
    outcomes: [
      "Écrire des hooks qui arrêtent le scroll en 2 secondes",
      "Tourner avec un smartphone : lumière, son, cadrage",
      "Monter vite sur CapCut : sous-titres, rythme, effets",
      "Comprendre les algorithmes TikTok, Instagram et YouTube",
      "Proposer ses services de créateur UGC aux marques",
    ],
    audience: ["Créateurs qui démarrent", "Marques et commerçants", "Futurs créateurs UGC"],
    prerequisites: "Un smartphone récent.",
    tools: ["CapCut", "TikTok", "Instagram", "YouTube Shorts", "Micro-cravate"],
    project: "Une série de 10 vidéos prêtes à publier et votre portfolio UGC.",
    modules: [
      { title: "Comprendre les algorithmes", lessons: 3, minutes: 35 },
      { title: "Hooks et scripts", lessons: 5, minutes: 55 },
      { title: "Tourner au smartphone", lessons: 5, minutes: 50 },
      { title: "Montage sur CapCut", lessons: 7, minutes: 85 },
      { title: "Publier, analyser, itérer", lessons: 4, minutes: 40 },
      { title: "Devenir créateur UGC", lessons: 4, minutes: 45 },
    ],
  },
  {
    slug: "seo-et-geo",
    title: "SEO & GEO : être visible sur Google et les IA",
    subtitle: "Le référencement naturel à l'ère de ChatGPT et des AI Overviews.",
    category: "marketing",
    level: "Intermédiaire",
    price: 247,
    icon: "search",
    rank: 11,
    badge: "Nouveau",
    updated: "2026-10",
    description:
      "Les recherches passent désormais autant par Google que par les assistants IA. Cette formation couvre le SEO classique (technique, contenu, liens) et le GEO (Generative Engine Optimization) pour être cité dans les réponses de ChatGPT, Perplexity et des AI Overviews.",
    outcomes: [
      "Faire un audit SEO technique de son site",
      "Trouver les bons mots-clés et intentions de recherche",
      "Écrire des contenus qui se positionnent et se font citer par les IA",
      "Obtenir des liens et mentions de qualité",
      "Mesurer sa visibilité sur Google et dans les moteurs IA",
    ],
    audience: ["Propriétaires de sites et e-commerçants", "Rédacteurs web et marketeurs", "Freelances SEO"],
    prerequisites: "Avoir un site (WordPress, Shopify, Webflow…) ou un projet de site.",
    tools: ["Google Search Console", "Semrush / Ahrefs", "Screaming Frog", "Google Analytics"],
    project: "L'audit et le plan d'action SEO/GEO complet de votre site.",
    modules: [
      { title: "Comment fonctionnent Google et les moteurs IA", lessons: 4, minutes: 45 },
      { title: "SEO technique", lessons: 6, minutes: 75 },
      { title: "Recherche de mots-clés", lessons: 4, minutes: 50 },
      { title: "Contenus qui se positionnent", lessons: 6, minutes: 70 },
      { title: "GEO : être cité par les IA", lessons: 5, minutes: 60 },
      { title: "Netlinking et mesure", lessons: 4, minutes: 45 },
    ],
  },
  {
    slug: "data-analyse-excel-sql-power-bi",
    title: "Data analyse : Excel, SQL & Power BI",
    subtitle: "Le trio de compétences le plus demandé dans les offres d'emploi.",
    category: "tech",
    level: "Débutant",
    price: 347,
    icon: "database",
    rank: 12,
    updated: "2026-08",
    description:
      "Une formation progressive et très pratique pour savoir interroger, nettoyer et visualiser des données. Vous terminez avec un portfolio de tableaux de bord à montrer en entretien, que vous visiez un poste de data analyst ou que vous vouliez simplement piloter votre activité par les chiffres.",
    outcomes: [
      "Maîtriser Excel avancé : tableaux croisés, RECHERCHEX, Power Query",
      "Écrire des requêtes SQL : jointures, agrégations, fonctions fenêtres",
      "Construire des tableaux de bord interactifs dans Power BI",
      "Raconter une histoire avec les données",
      "Utiliser l'IA pour accélérer l'analyse",
    ],
    audience: ["Personnes en reconversion vers la data", "Contrôleurs de gestion, RH, marketeurs", "Étudiants"],
    prerequisites: "Connaître les bases d'Excel.",
    tools: ["Excel", "Power Query", "PostgreSQL", "Power BI", "Assistants IA"],
    project: "Un portfolio de 3 tableaux de bord sur des jeux de données réels.",
    modules: [
      { title: "Excel avancé", lessons: 7, minutes: 90 },
      { title: "Power Query et nettoyage", lessons: 5, minutes: 65 },
      { title: "SQL : les fondamentaux", lessons: 7, minutes: 95 },
      { title: "SQL avancé", lessons: 5, minutes: 70 },
      { title: "Power BI : modélisation et DAX", lessons: 7, minutes: 100 },
      { title: "Data storytelling", lessons: 3, minutes: 35 },
      { title: "Projets portfolio", lessons: 3, minutes: 60 },
    ],
  },
  {
    slug: "cybersecurite-essentielle",
    title: "Cybersécurité essentielle",
    subtitle: "Protéger ses comptes, son entreprise et ses clients des attaques courantes.",
    category: "tech",
    level: "Débutant",
    price: 197,
    icon: "shield",
    rank: 14,
    updated: "2026-07",
    description:
      "Phishing, rançongiciels, fuites de données : les PME et indépendants sont aujourd'hui les premières cibles. Cette formation donne les bons réflexes et les mesures concrètes à mettre en place, et constitue une première marche vers les métiers de la cybersécurité.",
    outcomes: [
      "Reconnaître les attaques de phishing et d'ingénierie sociale",
      "Sécuriser ses comptes : gestionnaire de mots de passe, 2FA, clés d'accès",
      "Protéger postes, smartphones et réseau Wi-Fi",
      "Mettre en place sauvegardes et plan de réaction",
      "Comprendre les obligations RGPD et NIS 2",
    ],
    audience: ["Dirigeants de TPE/PME", "Indépendants", "Curieux qui envisagent une carrière cyber"],
    prerequisites: "Aucun.",
    tools: ["Bitwarden", "Authentificateurs", "Outils de sauvegarde", "Check-lists ANSSI"],
    project: "La politique de sécurité et le plan de réponse à incident de votre structure.",
    modules: [
      { title: "Panorama des menaces", lessons: 4, minutes: 40 },
      { title: "Identités et mots de passe", lessons: 4, minutes: 45 },
      { title: "Postes, mobiles et réseau", lessons: 5, minutes: 55 },
      { title: "Sauvegardes et réponse à incident", lessons: 4, minutes: 45 },
      { title: "Cadre légal et sensibilisation", lessons: 3, minutes: 35 },
    ],
  },
  {
    slug: "ux-ui-design-figma",
    title: "UX/UI design avec Figma",
    subtitle: "Concevoir des interfaces claires, belles et faciles à utiliser.",
    category: "tech",
    level: "Débutant",
    price: 297,
    icon: "layout",
    rank: 13,
    updated: "2026-08",
    description:
      "Du besoin utilisateur à la maquette interactive : apprenez la démarche UX et les règles de design d'interface, puis maîtrisez Figma (composants, auto layout, design system, prototypage) sur un projet complet d'application mobile.",
    outcomes: [
      "Mener des entretiens utilisateurs et définir des personas",
      "Construire wireframes et parcours utilisateurs",
      "Appliquer les règles de typographie, couleur et espacement",
      "Maîtriser Figma : auto layout, composants, variables",
      "Prototyper et tester une application",
    ],
    audience: ["Futurs designers en reconversion", "Développeurs et product managers", "Entrepreneurs qui maquettent leur produit"],
    prerequisites: "Aucun. Un ordinateur suffit (Figma est gratuit).",
    tools: ["Figma", "FigJam", "Maze", "Plugins IA Figma"],
    project: "Une application mobile complète, du wireframe au prototype testé.",
    modules: [
      { title: "La démarche UX", lessons: 5, minutes: 55 },
      { title: "Architecture et wireframes", lessons: 4, minutes: 45 },
      { title: "Fondamentaux de l'UI", lessons: 5, minutes: 60 },
      { title: "Figma de A à Z", lessons: 8, minutes: 110 },
      { title: "Design system", lessons: 4, minutes: 50 },
      { title: "Prototypage et tests", lessons: 4, minutes: 45 },
    ],
  },
];

export const packs: Pack[] = [
  {
    slug: "pack-ia-complet",
    title: "Pack IA complet",
    tagline: "De l'utilisation quotidienne aux agents et aux apps.",
    description:
      "Les trois formations IA pour passer d'utilisateur à créateur : prompting, automatisations avec agents, puis vos propres applications.",
    price: 697,
    icon: "spark",
    courses: ["ia-generative-au-quotidien", "agents-ia-automatisation", "creer-des-apps-avec-l-ia"],
    highlight: true,
  },
  {
    slug: "pack-entrepreneur-du-web",
    title: "Pack Entrepreneur du web",
    tagline: "Lancer, vendre et se faire connaître.",
    description:
      "Le parcours pour vivre de son expertise en ligne : se lancer en freelance, créer un produit numérique, savoir le vendre et attirer des clients sur LinkedIn.",
    price: 497,
    icon: "briefcase",
    courses: [
      "lancer-son-activite-freelance",
      "creer-et-vendre-son-produit-numerique",
      "copywriting-qui-convertit",
      "personal-branding-linkedin",
    ],
  },
  {
    slug: "pack-createur-de-contenu",
    title: "Pack Créateur de contenu",
    tagline: "Être vu, retenu et trouvé.",
    description:
      "Vidéo courte, LinkedIn, copywriting et SEO/GEO : les quatre piliers d'une présence en ligne qui attire une audience durable.",
    price: 547,
    icon: "video",
    courses: [
      "video-courte-tiktok-reels",
      "personal-branding-linkedin",
      "copywriting-qui-convertit",
      "seo-et-geo",
    ],
  },
  {
    slug: "pass-integral",
    title: "Pass intégral",
    tagline: "Tout le catalogue, et toutes les formations à venir.",
    description:
      "L'accès à l'ensemble des formations actuelles et futures du catalogue, avec les mises à jour incluses.",
    price: 1490,
    icon: "package",
    courses: courses.map((c) => c.slug),
  },
];

export function getCourse(slug: string): Course | undefined {
  return courses.find((c) => c.slug === slug);
}

export function getPack(slug: string): Pack | undefined {
  return packs.find((p) => p.slug === slug);
}

export function coursesByRank(): Course[] {
  return [...courses].sort((a, b) => a.rank - b.rank);
}

export function lessonCount(course: Course): number {
  return course.modules.reduce((sum, m) => sum + m.lessons, 0);
}

export function totalMinutes(course: Course): number {
  return course.modules.reduce((sum, m) => sum + m.minutes, 0);
}

export function packCourses(pack: Pack): Course[] {
  return pack.courses.map((slug) => getCourse(slug)).filter((c): c is Course => Boolean(c));
}

/** Somme des prix unitaires des formations incluses. */
export function packValue(pack: Pack): number {
  return packCourses(pack).reduce((sum, c) => sum + c.price, 0);
}

export function packsIncluding(courseSlug: string): Pack[] {
  return packs.filter((p) => p.courses.includes(courseSlug) && p.slug !== "pass-integral");
}

/** Un article du panier : une formation ou un pack, identifiés par leur slug (uniques entre les deux listes). */
export type Product = {
  id: string;
  kind: "course" | "pack";
  title: string;
  price: number;
  icon: IconName;
  category: CategoryKey | null;
  href: string;
};

export function getProduct(id: string): Product | undefined {
  const course = getCourse(id);
  if (course) {
    return {
      id,
      kind: "course",
      title: course.title,
      price: course.price,
      icon: course.icon,
      category: course.category,
      href: `/formations/${course.slug}`,
    };
  }
  const pack = getPack(id);
  if (pack) {
    return { id, kind: "pack", title: pack.title, price: pack.price, icon: pack.icon, category: null, href: "/packs" };
  }
  return undefined;
}
