/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1C1917',
    background: '#F6F4F0',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#ECE8E1',
    textSecondary: '#6B645C',
    border: '#E7E2DA',
    accent: '#E8590C',
    accentText: '#FFFFFF',
    danger: '#C92A2A',
  },
  dark: {
    text: '#F5F2EE',
    background: '#0F0E0D',
    backgroundElement: '#1C1A18',
    backgroundSelected: '#2A2724',
    textSecondary: '#A8A29E',
    border: '#2E2A27',
    accent: '#FF7A33',
    accentText: '#1A0E05',
    danger: '#FF6B6B',
  },
} as const;

/** Couleurs proposées pour les matières. */
export const SubjectColors = [
  '#E8590C',
  '#1C7ED6',
  '#2F9E44',
  '#AE3EC9',
  '#F08C00',
  '#0CA678',
  '#E64980',
  '#5C7CFA',
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
