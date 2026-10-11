import { router, Slot, usePathname, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Glass } from './glass';
import { Logo } from './logo';
import { SettingsButton } from './settings-sheet';
import { ThemedText } from './themed-text';
import { IconButton } from './ui';

import { MaxContentWidth, WideBreakpoint } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { usePro } from '@/lib/pro';
import { formatClock } from '@/lib/stats';
import { timerEndsAt, useStore } from '@/lib/store';

export const NAV: { label: string; href: Href; path: string }[] = [
  { label: 'Accueil', href: '/', path: '/' },
  { label: 'Tâches', href: '/taches', path: '/taches' },
  { label: 'Fiches', href: '/fiches', path: '/fiches' },
  { label: 'Matières', href: '/matieres', path: '/matieres' },
  { label: 'Examens', href: '/examens', path: '/examens' },
  { label: 'Stats', href: '/stats', path: '/stats' },
  { label: 'Méthodes', href: '/methodes', path: '/methodes' },
];

/** Le lien est actif sur sa page et sur ses sous-pages (/methodes/pomodoro…). */
function isActive(pathname: string, path: string) {
  return path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`);
}

/**
 * Version web : une mise en page de site. Une barre de navigation en verre reste en haut de la
 * page (liens complets sur ordinateur, menu déroulant sur téléphone), le contenu défile dessous.
 * Sur iPhone, l'app native garde sa barre d'onglets Liquid Glass.
 */
export default function SiteLayout() {
  return (
    <View style={styles.page}>
      <Slot />
      <SiteHeader />
    </View>
  );
}

function SiteHeader() {
  const theme = useTheme();
  // Largeur réellement disponible pour la barre (0 pendant le rendu statique : menu compact).
  const [width, setWidth] = useState(0);
  const wide = width >= WideBreakpoint - 24;
  const pathname = usePathname();
  const { isPro, channel, openPaywall } = usePro();
  const [menuOpen, setMenuOpen] = useState(false);

  const go = (href: Href) => {
    setMenuOpen(false);
    router.navigate(href);
  };

  return (
    <View
      style={styles.headerWrap}
      pointerEvents="box-none"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Glass variant="strong" style={styles.header}>
        <Pressable accessibilityRole="link" accessibilityLabel="Accueil" onPress={() => go('/')}>
          <Logo />
        </Pressable>

        {wide && (
          <View style={styles.links} accessibilityRole="menubar">
            {NAV.map((item) => {
              const active = isActive(pathname, item.path);
              return (
                <Pressable
                  key={item.path}
                  accessibilityRole="link"
                  accessibilityState={{ selected: active }}
                  onPress={() => go(item.href)}
                  style={({ pressed, hovered }) => [
                    styles.link,
                    (active || hovered) && { backgroundColor: theme.backgroundSelected },
                    { transform: [{ scale: pressed ? 0.95 : 1 }] },
                  ]}>
                  <ThemedText
                    type={active ? 'smallBold' : 'small'}
                    style={{ color: active ? theme.accent : theme.text }}>
                    {item.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={styles.right}>
          {pathname !== '/' && <TimerPill onPress={() => go('/')} />}
          {wide && channel !== 'free' && !isPro && (
            <Pressable
              accessibilityRole="button"
              onPress={openPaywall}
              style={({ pressed }) => [
                styles.proButton,
                { backgroundColor: theme.accent, transform: [{ scale: pressed ? 0.95 : 1 }] },
              ]}>
              <ThemedText type="smallBold" style={{ color: theme.accentText }}>
                Passer Pro
              </ThemedText>
            </Pressable>
          )}
          <SettingsButton />
          {!wide && (
            <IconButton
              label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              onPress={() => setMenuOpen((o) => !o)}>
              <Svg width={20} height={20} viewBox="0 0 24 24">
                <Path
                  d={menuOpen ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16'}
                  stroke={theme.text}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </Svg>
            </IconButton>
          )}
        </View>
      </Glass>

      {!wide && menuOpen && (
        <Glass variant="strong" style={styles.menu}>
          {NAV.map((item) => {
            const active = isActive(pathname, item.path);
            return (
              <Pressable
                key={item.path}
                accessibilityRole="link"
                accessibilityState={{ selected: active }}
                onPress={() => go(item.href)}
                style={({ pressed }) => [
                  styles.menuItem,
                  active && { backgroundColor: theme.backgroundSelected },
                  pressed && { opacity: 0.6 },
                ]}>
                <ThemedText
                  style={[styles.menuLabel, { color: active ? theme.accent : theme.text }]}>
                  {item.label}
                </ThemedText>
              </Pressable>
            );
          })}
          {channel !== 'free' && !isPro && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setMenuOpen(false);
                openPaywall();
              }}
              style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.6 }]}>
              <ThemedText style={[styles.menuLabel, { color: theme.accent }]}>
                Bûcheur Pro ›
              </ThemedText>
            </Pressable>
          )}
        </Glass>
      )}
    </View>
  );
}

/** Rappel de la séance en cours quand on navigue ailleurs sur le site. */
function TimerPill({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  const { data } = useStore();
  const now = useNow(1000);
  const timer = data.activeTimer;
  if (!timer) return null;
  const subject = data.subjects.find((s) => s.id === timer.subjectId);
  const remaining = Math.max(0, (timerEndsAt(timer) - (timer.pausedAt ?? now)) / 1000);
  const color = timer.kind === 'break' ? '#7FB2D9' : (subject?.color ?? theme.accent);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Séance en cours, ${formatClock(remaining)} restantes`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        { backgroundColor: theme.backgroundSelected, transform: [{ scale: pressed ? 0.95 : 1 }] },
      ]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <ThemedText type="smallBold" style={styles.pillClock}>
        {formatClock(remaining)}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  headerWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingTop: 12,
    alignItems: 'center',
    gap: 8,
  },
  header: {
    width: '100%',
    maxWidth: MaxContentWidth + 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingLeft: 18,
    paddingRight: 8,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  links: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  link: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  proButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 22,
  },
  pillClock: {
    fontVariant: ['tabular-nums'],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  menu: {
    width: '100%',
    maxWidth: MaxContentWidth + 24,
    borderRadius: 26,
    padding: 8,
    overflow: 'hidden',
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 18,
  },
  menuLabel: {
    fontSize: 17,
    lineHeight: 22,
  },
});
