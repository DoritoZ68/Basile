/** Adresse publique du site (à remplacer par votre nom de domaine via NEXT_PUBLIC_SITE_URL). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://basile-nine.vercel.app").replace(/\/$/, "");
export const SITE_NAME = "Élan Académie";
export const SITE_TAGLINE = "Les formations numériques qui comptent vraiment en 2026.";
export const SITE_DESCRIPTION =
  "Formations en ligne sur l'IA générative, les agents IA et l'automatisation, le freelance, l'e-commerce, le copywriting, la vidéo courte, le SEO, la data et la cybersécurité. Accès à vie, projet concret, satisfait ou remboursé 30 jours.";
export const CONTACT_EMAIL = "bonjour@elan-academie.fr";

/**
 * Informations légales obligatoires pour vendre en France (mentions légales + CGV).
 * Remplacez chaque valeur entre crochets par vos vraies informations.
 */
export const LEGAL = {
  owner: "[Nom et prénom, ou raison sociale]",
  status: "[Statut : micro-entreprise, EURL, SASU…]",
  siret: "[Numéro SIRET]",
  address: "[Adresse postale du siège]",
  publisher: "[Nom du directeur de la publication]",
  vat: "TVA non applicable, article 293 B du CGI",
  mediator: "[Nom, adresse et site du médiateur de la consommation]",
  host: "Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis — vercel.com",
};
