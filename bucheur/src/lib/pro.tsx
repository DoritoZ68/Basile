import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import Purchases, { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';

/** Identifiant du droit configuré dans RevenueCat. */
const ENTITLEMENT = 'pro';
const CACHE_KEY = 'bucheur:pro';
/** Prix affiché tant que le prix réel de l'App Store n'est pas chargé. */
export const FALLBACK_PRICE = '4,99 €';

/** Ce que la version gratuite permet. */
export const FREE_LIMITS = { subjects: 4, exams: 2 } as const;

const API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
});

/**
 * Sans clé RevenueCat (web, ou avant la configuration), les achats sont simulés en
 * développement pour pouvoir tester l'écran Pro ; en production ils sont indisponibles.
 */
const SIMULATED = !API_KEY && __DEV__;

export type PurchaseResult = 'success' | 'cancelled' | 'error';

type Pro = {
  isPro: boolean;
  /** Prix localisé, ex. « 4,99 € ». */
  price: string;
  /** Faux si la boutique n'est pas joignable (pas de clé, pas de réseau…). */
  available: boolean;
  purchase: () => Promise<PurchaseResult>;
  /** Renvoie vrai si un achat Pro a été retrouvé. */
  restore: () => Promise<boolean>;
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

export function ProProvider({ children }: { children: ReactNode }) {
  const [isPro, setIsPro] = useState(false);
  const [pkg, setPkg] = useState<PurchasesPackage | null>(null);
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
    isPro,
    price: pkg?.product.priceString ?? FALLBACK_PRICE,
    available: SIMULATED || pkg !== null,
    paywallOpen,
    openPaywall: () => setPaywallOpen(true),
    closePaywall: () => setPaywallOpen(false),

    async purchase() {
      if (SIMULATED) {
        update(true);
        return 'success';
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
      if (SIMULATED) return isPro;
      if (!API_KEY) return false;
      try {
        const ok = hasPro(await Purchases.restorePurchases());
        update(ok);
        return ok;
      } catch {
        return false;
      }
    },
  };

  return <ProContext value={pro}>{children}</ProContext>;
}
