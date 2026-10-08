import Stripe from "stripe";

let client: Stripe | null | undefined;

/** Client Stripe côté serveur, ou null tant que STRIPE_SECRET_KEY n'est pas configurée. */
export function getStripe(): Stripe | null {
  if (client === undefined) {
    const key = process.env.STRIPE_SECRET_KEY;
    client = key ? new Stripe(key) : null;
  }
  return client;
}

/**
 * Liens d'accès livrés après paiement, lus depuis la variable d'environnement
 * COURSE_ACCESS_LINKS (JSON { "slug-de-formation": "https://…" }). Ils ne sont
 * jamais dans le code : le dépôt est public.
 */
export function getAccessLinks(): Record<string, string> {
  try {
    const parsed = JSON.parse(process.env.COURSE_ACCESS_LINKS || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
