import { useEffect } from 'react';
import { Appearance, useColorScheme as useRNColorScheme } from 'react-native';

import { useOptionalStore } from '@/lib/store';

/** Thème effectif : celui de l'iPhone, sauf si l'utilisateur a forcé le clair ou le sombre. */
export function useColorScheme() {
  const system = useRNColorScheme();
  const appearance = useOptionalStore()?.settings.appearance ?? 'auto';
  return appearance === 'auto' ? system : appearance;
}

/** Applique le thème choisi aux éléments natifs (barre d'onglets, Liquid Glass, clavier). */
export function useApplyAppearance() {
  const appearance = useOptionalStore()?.settings.appearance ?? 'auto';
  useEffect(() => {
    Appearance.setColorScheme(appearance === 'auto' ? 'unspecified' : appearance);
  }, [appearance]);
}
