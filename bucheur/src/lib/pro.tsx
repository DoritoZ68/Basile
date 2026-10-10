import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { Linking, Platform } from 'react-native';
import Purchases, { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';

import { checkLicense, type LicenseCheck } from './license';

/** Identifiant du droit configuré dans RevenueCat. */
const ENTITLEMENT = 'pro';
const CACHE_KEY = 'bucheur:pro';
const LICENSE_KEY = 'bucheur:license';
/** Prix affiché tant que le prix réel de la boutique n'est pas chargé. */
export const FALLBACK_PRICE = '4,99 €';

/** Ce que la version gratuite permet. */
export const FREE_LIMITS = { subjects: 4, exams: 2 } as const;

const API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
});
const GUMROAD_PRODUCT_ID = process.env.EXPO_PUBLIC_GUMROAD_PRODUCT_ID;
const GUMROAD_URL = process.env.EXPO_PUBLIC_GUMROAD_URL;
const PREVIEW = process.env.EXPO_PUBLIC_PREVIEW === '1';
/** Captures App Store : l'écran d'achat s'affiche comme sur iPhone, boutique disponible. */
const SCREENSHOTS = process.env.EXPO_PUBLIC_SCREENSHOTS === '1';

/**
 * Comment Bûcheur Pro est vendu :
 * - `store` : achat intégré App Store / Google Play (RevenueCat) ;
 * - `license` : version web, achat sur Gumroad puis clé de licence collée dans l'app ;
 * - `simulated` : développement et aperçu web, aucun paiement ;
 * - `free` : rien n'est configuré, toutes les fonctions Pro sont offertes.
 */
export type SalesChannel = 'store' | 'license' | 'simulated' | 'free';
export const CHANNEL: SalesChannel =
  API_KEY || SCREENSHOTS
    ? 'store'
    : PREVIEW
      ? 'simulated'
      : GUMROAD_PRODUCT_ID && GUMROAD_URL
        ? 'license'
        : __DEV__
          ? 'simulated'
          : 'free';

export type PurchaseResult = 'success' | 'cancelled' | 'error';
export type ActivationResult = { ok: boolean; message: string };

type Pro = {
  isPro: boolean;
  channel: SalesChannel;
  /** Prix localisé, ex. « 4,99 € ». */
  price: string;
  /** Faux si la boutique n'est pas joignable (pas de clé, pas de réseau…). */
  available: boolean;
  /** Clé de licence Gumroad active, pour l'afficher masquée. */
  licenseKey: string | null;
  /** Achat intégré (boutique) ou ouverture de la page Gumroad (licence). */
  purchase: () => Promise<PurchaseResult>;
  /** Renvoie vrai si un achat Pro a été retrouvé (boutique uniquement). */
  restore: () => Promise<boolean>;
  /** Active Pro avec une clé reçue par e-mail (version web). */
  activateLicense: (key: string) => Promise<ActivationResult>;
  paywallOpen: boolean;
  openPaywall: () => void;
  closePaywall: () => void;
};

const ProContext = createContext<Pro | null>(null);

export function usePro(): Pro {
  const pro = use(ProContext);
  if (!pro) throw new Error('usePro doit être utilisé dans <ProProvider>');
  return pro;
}

const hasPro = (info: CustomerInfo) => info.entitlements.active[ENTITLEMENT] !== undefined;

const ACTIVATION_MESSAGES: Record<LicenseCheck['status'], string> = {
  valid: 'Merci ! Bûcheur Pro est activé.',
  invalid: 'Clé introuvable. Vérifie qu’elle est copiée en entier depuis l’e-mail de Gumroad.',
  refunded: 'Cet achat a été remboursé : la clé n’est plus valable.',
  'too-many': 'Cette clé est déjà activée sur trop d’appareils.',
  offline: 'Impossible de joindre Gumroad. Vérifie ta connexion et réessaie.',
};

export function ProProvider({ children }: { children: ReactNode }) {
  const [isPro, setIsPro] = useState(false);
  const [pkg, setPkg] = useState<PurchasesPackage | null>(null);
  const [licenseKey, setLicenseKey] = useState<string | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);

  const update = (value: boolean) => {
    setIsPro(value);
    AsyncStorage.setItem(CACHE_KEY, value ? '1' : '0').catch(() => {});
  };

  useEffect(() => {
    // Valeur en cache d'abord, pour que Pro reste actif hors connexion.
    AsyncStorage.getItem(CACHE_KEY)
      .then((v) => v === '1' && setIsPro(true))
      .catch(() => {});

    if (CHANNEL === 'license' && GUMROAD_PRODUCT_ID) {
      // Revérifie la clé au démarrage : un achat remboursé ne débloque plus Pro.
      AsyncStorage.getItem(LICENSE_KEY)
        .then(async (key) => {
          if (!key) return;
          setLicenseKey(key);
          const check = await checkLicense(GUMROAD_PRODUCT_ID, key, false);
          if (check.status === 'offline') return;
          if (check.status === 'valid') return update(true);
          update(false);
          setLicenseKey(null);
          AsyncStorage.removeItem(LICENSE_KEY).catch(() => {});
        })
        .catch(() => {});
      return;
    }

    if (!API_KEY) return;
    const onInfo = (info: CustomerInfo) => update(hasPro(info));
    try {
      Purchases.configure({ apiKey: API_KEY });
      Purchases.addCustomerInfoUpdateListener(onInfo);
      Purchases.getCustomerInfo()
        .then(onInfo)
        .catch(() => {});
      Purchases.getOfferings()
        .then((o) => setPkg(o.current?.lifetime ?? o.current?.availablePackages[0] ?? null))
        .catch(() => {});
    } catch {
      // Boutique indisponible : on garde la valeur en cache.
    }
    return () => {
      Purchases.removeCustomerInfoUpdateListener(onInfo);
    };
  }, []);

  const pro: Pro = {
    isPro: CHANNEL === 'free' || isPro,
    channel: CHANNEL,
    price: pkg?.product.priceString ?? FALLBACK_PRICE,
    available: CHANNEL !== 'store' || SCREENSHOTS || pkg !== null,
    licenseKey,
    paywallOpen,
    openPaywall: () => setPaywallOpen(true),
    closePaywall: () => setPaywallOpen(false),

    async purchase() {
      if (CHANNEL === 'simulated') {
        update(true);
        return 'success';
      }
      if (CHANNEL === 'license' && GUMROAD_URL) {
        // `wanted=true` ouvre directement le paiement sur la page Gumroad.
        const url = `${GUMROAD_URL}${GUMROAD_URL.includes('?') ? '&' : '?'}wanted=true`;
        await Linking.openURL(url).catch(() => {});
        return 'cancelled';
      }
      if (!pkg) return 'error';
      try {
        const { customerInfo } = await Purchases.purchasePackage(pkg);
        const ok = hasPro(customerInfo);
        update(ok);
        return ok ? 'success' : 'error';
      } catch (e) {
        return (e as { userCancelled?: boolean }).userCancelled ? 'cancelled' : 'error';
      }
    },

    async restore() {
      if (CHANNEL === 'simulated') return isPro;
      if (!API_KEY) return false;
      try {
        const ok = hasPro(await Purchases.restorePurchases());
        update(ok);
        return ok;
      } catch {
        return false;
      }
    },

    async activateLicense(key) {
      const trimmed = key.trim();
      if (!trimmed) return { ok: false, message: 'Colle la clé reçue par e-mail.' };
      if (CHANNEL === 'simulated') {
        update(true);
        return { ok: true, message: ACTIVATION_MESSAGES.valid };
      }
      if (!GUMROAD_PRODUCT_ID) return { ok: false, message: ACTIVATION_MESSAGES.offline };
      const check = await checkLicense(GUMROAD_PRODUCT_ID, trimmed, true);
      if (check.status === 'valid') {
        update(true);
        setLicenseKey(trimmed);
        AsyncStorage.setItem(LICENSE_KEY, trimmed).catch(() => {});
      }
      return { ok: check.status === 'valid', message: ACTIVATION_MESSAGES[check.status] };
    },
  };

  return <ProContext value={pro}>{children}</ProContext>;
}
