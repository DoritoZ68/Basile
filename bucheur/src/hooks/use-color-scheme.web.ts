import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import { useOptionalStore } from '@/lib/store';

const subscribe = () => () => {};

/**
 * Thème effectif : celui du système, sauf si l'utilisateur a forcé le clair ou le sombre.
 * Avant l'hydratation (rendu statique), on renvoie toujours le thème clair.
 */
export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const system = useRNColorScheme();
  const appearance = useOptionalStore()?.settings.appearance ?? 'auto';
  if (!hasHydrated) return 'light';
  return appearance === 'auto' ? system : appearance;
}

/** Sur le web, rien à appliquer : chaque écran lit `useColorScheme`. */
export function useApplyAppearance() {}
