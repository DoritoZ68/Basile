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
    // Contraste ≥ 5:1 sur le fond et les cartes (WCAG AA).
    textSecondary: '#635F58',
    border: '#E4E1DB',
    accent: '#3E6B5A',
    accentText: '#FFFFFF',
    danger: '#B4483A',
    wood: '#EFE7D8',
    glass: 'rgba(255,255,255,0.52)',
    glassStrong: 'rgba(250,249,246,0.86)',
    glassEdge: 'rgba(255,255,255,0.85)',
  },
  dark: {
    text: '#ECEBE7',
    background: '#111312',
    backgroundElement: '#1A1D1C',
    backgroundSelected: '#262A29',
    textSecondary: '#B9B6AF',
    border: '#2B2F2E',
    accent: '#8FBFA8',
    accentText: '#0E1A15',
    danger: '#E08A7E',
    wood: '#22211D',
    glass: 'rgba(48,53,51,0.42)',
    glassStrong: 'rgba(30,33,32,0.86)',
    glassEdge: 'rgba(255,255,255,0.16)',
  },
} as const;

/** Essences de bois : couleurs d'accent proposées avec Bûcheur Pro. */
export const Essences = {
  sauge: { name: 'Sauge', light: '#3E6B5A', dark: '#8FBFA8' },
  chene: { name: 'Chêne', light: '#8A5A2B', dark: '#D9A86C' },
  erable: { name: 'Érable', light: '#A4472F', dark: '#E8907A' },
  nuit: { name: 'Bois de nuit', light: '#2F4A6B', dark: '#8FB0D8' },
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

// Sur le web, la barre d'onglets flotte en bas de l'écran comme sur iOS 26.
export const BottomTabInset = Platform.select({ ios: 50, android: 80, web: 96 }) ?? 0;
export const MaxContentWidth = 800;
