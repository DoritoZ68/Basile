/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors, Essences } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOptionalStore } from '@/lib/store';

export function useTheme() {
  const scheme = useColorScheme();
  const theme = scheme === 'unspecified' ? 'light' : scheme;
  const essence = useOptionalStore()?.data.settings.essence ?? 'sauge';

  return { ...Colors[theme], accent: Essences[essence][theme] };
}
