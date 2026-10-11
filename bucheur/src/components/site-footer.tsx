import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Logo } from '@/components/logo';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePro } from '@/lib/pro';

const COLUMNS = [
  {
    title: 'Réviser',
    links: [
      { label: 'Accueil', href: '/' },
      { label: 'Tâches', href: '/taches' },
      { label: 'Fiches', href: '/fiches' },
    ],
  },
  {
    title: 'Organiser',
    links: [
      { label: 'Matières', href: '/matieres' },
      { label: 'Examens', href: '/examens' },
      { label: 'Statistiques', href: '/stats' },
    ],
  },
  {
    title: 'Apprendre',
    links: [
      { label: 'Méthodes de révision', href: '/methodes' },
      { label: 'Pomodoro', href: '/methodes/pomodoro' },
      { label: 'Répétition espacée', href: '/methodes/repetition-espacee' },
    ],
  },
] as const;

/** Pied de page du site : liens, rappel sur la confidentialité, Bûcheur Pro. */
export function SiteFooter() {
  const theme = useTheme();
  const { isPro, channel, price, openPaywall } = usePro();
  return (
    <View style={[styles.footer, { borderTopColor: theme.border }]}>
      <View style={styles.inner}>
        <View style={styles.brand}>
          <Logo size={26} />
          <ThemedText type="small" themeColor="textSecondary" style={styles.pitch}>
            Le minuteur de révision qui fait pousser un arbre, un cerne par séance. Tes données
            restent dans ce navigateur : pas de compte, pas de publicité.
          </ThemedText>
          {channel !== 'free' && !isPro && (
            <Pressable accessibilityRole="button" onPress={openPaywall}>
              <ThemedText type="smallBold" style={{ color: theme.accent }}>
                Bûcheur Pro · {price}, une seule fois ›
              </ThemedText>
            </Pressable>
          )}
        </View>
        {COLUMNS.map((col) => (
          <View key={col.title} style={styles.column}>
            <ThemedText type="smallBold">{col.title}</ThemedText>
            {col.links.map((l) => (
              <Pressable
                key={l.href}
                accessibilityRole="link"
                onPress={() => router.navigate(l.href)}
                style={({ pressed }) => pressed && { opacity: 0.6 }}>
                <ThemedText type="small" themeColor="textSecondary">
                  {l.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        ))}
      </View>
      <ThemedText type="small" themeColor="textSecondary" style={styles.copy}>
        © {new Date().getFullYear()} Bûcheur · Fait pour réviser sereinement
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    marginTop: Spacing.six,
    paddingTop: Spacing.five,
    borderTopWidth: 1,
    gap: Spacing.four,
  },
  inner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.five,
  },
  brand: {
    flexGrow: 2,
    flexShrink: 1,
    flexBasis: 280,
    gap: Spacing.two,
  },
  pitch: {
    maxWidth: 380,
  },
  column: {
    flexGrow: 1,
    flexBasis: 140,
    gap: Spacing.two,
  },
  copy: {
    fontSize: 12,
  },
});
