import { Fraunces_400Regular_Italic } from '@expo-google-fonts/fraunces/400Regular_Italic';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, type ReactNode } from 'react';

import AppTabs from '@/components/app-tabs';
import { Paywall } from '@/components/paywall';
import { useApplyAppearance, useColorScheme } from '@/hooks/use-color-scheme';
import { ProProvider } from '@/lib/pro';
import { StoreProvider, useStore } from '@/lib/store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Fraunces_600SemiBold, Fraunces_400Regular_Italic });
  return (
    <StoreProvider>
      <Themed>
        <ProProvider>
          <HideSplashWhenReady ready={fontsLoaded || fontError !== null} />
          <AppTabs />
          <Paywall />
        </ProProvider>
      </Themed>
    </StoreProvider>
  );
}

/** Thème de navigation, selon l'apparence choisie dans les réglages. */
function Themed({ children }: { children: ReactNode }) {
  useApplyAppearance();
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {children}
    </ThemeProvider>
  );
}

function HideSplashWhenReady({ ready }: { ready: boolean }) {
  const { loaded } = useStore();
  useEffect(() => {
    if (loaded && ready) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, ready]);
  return null;
}
