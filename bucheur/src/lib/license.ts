/**
 * Clés de licence Gumroad : la version web vend Bûcheur Pro sur Gumroad, qui envoie une clé
 * par e-mail ; l'app la vérifie auprès de l'API publique de Gumroad (pas de serveur à nous).
 */

const VERIFY_URL = 'https://api.gumroad.com/v2/licenses/verify';

/** Une même clé peut activer Pro sur ce nombre d'appareils au maximum. */
export const MAX_ACTIVATIONS = 5;

export type LicenseCheck =
  | { status: 'valid'; uses: number }
  | { status: 'invalid' | 'refunded' | 'too-many' }
  /** Gumroad injoignable : on ne tranche pas (pas de réseau, panne…). */
  | { status: 'offline' };

type GumroadResponse = {
  success: boolean;
  uses?: number;
  purchase?: { refunded?: boolean; chargebacked?: boolean; disputed?: boolean };
};

/**
 * Vérifie une clé. `activate` compte une activation de plus (nouvel appareil) ;
 * les vérifications de routine au démarrage passent `false`.
 */
export async function checkLicense(
  productId: string,
  licenseKey: string,
  activate: boolean,
  fetchImpl: typeof fetch = fetch,
): Promise<LicenseCheck> {
  let body: GumroadResponse;
  try {
    const res = await fetchImpl(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        product_id: productId,
        license_key: licenseKey.trim(),
        increment_uses_count: String(activate),
      }).toString(),
    });
    // 404 = clé inconnue ; toute autre erreur HTTP (5xx…) ne doit pas retirer Pro.
    if (!res.ok && res.status !== 404) return { status: 'offline' };
    body = (await res.json()) as GumroadResponse;
  } catch {
    return { status: 'offline' };
  }

  if (!body.success) return { status: 'invalid' };
  const p = body.purchase ?? {};
  if (p.refunded || p.chargebacked || p.disputed) return { status: 'refunded' };
  const uses = body.uses ?? 0;
  if (activate && uses > MAX_ACTIVATIONS) return { status: 'too-many' };
  return { status: 'valid', uses };
}

/** « ABCD1234-…-WXYZ » → « ••••WXYZ », pour afficher la clé sans la révéler. */
export function maskKey(key: string): string {
  return `••••${key.trim().slice(-4)}`;
}
