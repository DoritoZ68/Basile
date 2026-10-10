/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1F2328',
    background: '#F7F6F3',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#EEECE7',
    textSecondary: '#77736C',
    border: '#E4E1DB',
    accent: '#3E6B5A',
    accentText: '#FFFFFF',
    danger: '#B4483A',
    wood: '#EFE7D8',
  },
  dark: {
    text: '#ECEBE7',
    background: '#111312',
    backgroundElement: '#1A1D1C',
    backgroundSelected: '#262A29',
    textSecondary: '#97958F',
    border: '#2B2F2E',
    accent: '#8FBFA8',
    accentText: '#0E1A15',
    danger: '#E08A7E',
    wood: '#22211D',
  },
} as const;

/** Couleurs douces proposées pour les matières. */
export const SubjectColors = [
  '#5B7FA6',
  '#C07A4F',
  '#6E9A78',
  '#9A7BB0',
  '#C9A24D',
  '#5E9C9A',
  '#B9727F',
  '#7A8794',
] as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/** Police des titres : Fraunces, chargée dans `app/_layout.tsx`. */
export const Display = {
  title: 'Fraunces_600SemiBold',
  italic: 'Fraunces_400Regular_Italic',
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
