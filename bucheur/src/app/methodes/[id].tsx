import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MethodCard } from '@/components/method-card';
import { FREE_MAX_FOCUS, ScreenSettingsButton } from '@/components/settings-sheet';
import { ThemedText } from '@/components/themed-text';
import { Button, Grid, Panel, Screen, SectionTitle, TextLink } from '@/components/ui';
import { Display, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { METHODS, type Method } from '@/lib/methods';
import { usePro } from '@/lib/pro';
import { useStore } from '@/lib/store';

/** Une page par méthode, générée à l'avance pour le site (/methodes/pomodoro…). */
export function generateStaticParams(): { id: string }[] {
  return METHODS.map((m) => ({ id: m.id }));
}

export default function MethodScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const method = METHODS.find((m) => m.id === id);
  if (!method) {
    return (
      <Screen title="Méthode introuvable">
        <TextLink label="‹ Toutes les méthodes" onPress={() => router.navigate('/methodes')} />
      </Screen>
    );
  }
  // La clé remet l'état à zéro (et la page en haut) quand on passe d'une méthode à l'autre.
  return <Article key={method.id} method={method} />;
}

function Article({ method }: { method: Method }) {
  const theme = useTheme();
  const { updateSettings } = useStore();
  const { isPro, openPaywall } = usePro();
  const [applied, setApplied] = useState(false);
  const others = METHODS.filter((x) => x.id !== method.id && x.category === method.category)
    .concat(METHODS.filter((x) => x.category !== method.category))
    .slice(0, 3);

  const act = () => {
    const a = method.action;
    if (!a) return;
    if (a.kind === 'link') return router.navigate(a.href);
    if (a.focusMin > FREE_MAX_FOCUS && !isPro) return openPaywall();
    updateSettings({
      focusMin: a.focusMin,
      breakMin: a.breakMin,
      breaks: true,
      ...(a.longBreakEvery ? { longBreakEvery: a.longBreakEvery } : {}),
    });
    setApplied(true);
  };

  return (
    <Screen
      subtitle={`${method.category} · lecture ${method.readMin} min`}
      title={method.title}
      action={<ScreenSettingsButton />}>
      <TextLink label="‹ Toutes les méthodes" onPress={() => router.navigate('/methodes')} />
      <ThemedText style={styles.summary}>{method.summary}</ThemedText>

      <Grid min={320}>
        <View style={styles.column}>
          <Panel title="Pourquoi ça marche">
            <ThemedText themeColor="textSecondary" style={styles.body}>
              {method.why}
            </ThemedText>
          </Panel>
          <Panel title="Comment faire">
            {method.steps.map((step, i) => (
              <View key={i} style={styles.step}>
                <View style={[styles.stepNumber, { backgroundColor: theme.accent }]}>
                  <ThemedText type="smallBold" style={{ color: theme.accentText }}>
                    {i + 1}
                  </ThemedText>
                </View>
                <ThemedText style={[styles.body, styles.flex]}>{step}</ThemedText>
              </View>
            ))}
          </Panel>
        </View>
        <View style={styles.column}>
          <Panel tint={theme.accent}>
            <ThemedText type="smallBold" style={[styles.tipLabel, { color: theme.accentText }]}>
              À RETENIR
            </ThemedText>
            <ThemedText style={[styles.tip, { color: theme.accentText }]}>{method.tip}</ThemedText>
          </Panel>
          {method.action && (
            <Panel eyebrow="Dans Bûcheur">
              <ThemedText themeColor="textSecondary">
                {method.action.kind === 'timer'
                  ? `Règle tes séances sur ${method.action.focusMin} minutes et tes pauses sur ${method.action.breakMin} minutes.`
                  : 'Passe directement à la pratique.'}
              </ThemedText>
              {applied ? (
                <>
                  <ThemedText type="smallBold" style={{ color: theme.accent }}>
                    C’est réglé. Tes prochaines séances suivront cette méthode.
                  </ThemedText>
                  <Button label="Lancer une séance" onPress={() => router.navigate('/')} />
                </>
              ) : (
                <Button label={method.action.label} onPress={act} />
              )}
            </Panel>
          )}
        </View>
      </Grid>

      <SectionTitle>À lire aussi</SectionTitle>
      <Grid min={260}>
        {others.map((x) => (
          <MethodCard key={x.id} method={x} />
        ))}
      </Grid>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  column: {
    gap: Spacing.three,
  },
  summary: {
    fontFamily: Display.italic,
    fontWeight: 'normal',
    fontSize: 21,
    lineHeight: 30,
    maxWidth: 720,
  },
  body: {
    fontSize: 16,
    lineHeight: 25,
  },
  step: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipLabel: {
    fontSize: 12,
    letterSpacing: 0.8,
  },
  tip: {
    fontFamily: Display.italic,
    fontWeight: 'normal',
    fontSize: 20,
    lineHeight: 29,
  },
});
