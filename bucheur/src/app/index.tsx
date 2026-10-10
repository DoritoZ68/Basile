import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressRing } from '@/components/progress-ring';
import { ThemedText } from '@/components/themed-text';
import { Button, Chip, Group, Row, Screen, Segmented, SectionTitle } from '@/components/ui';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { currentStreak, daysUntil, formatClock, formatDuration, minutesOn } from '@/lib/stats';
import { useStore } from '@/lib/store';
import type { ActiveTimer } from '@/lib/types';

const DURATIONS = [15, 25, 45, 60].map((d) => ({ value: d, label: `${d} min` }));
const BREAK_MIN = 5;

const FOCUS_LINES = [
  'Une page après l’autre.',
  'Le plus dur était de commencer. C’est fait.',
  'Reste sur cette tâche, le reste peut attendre.',
  'Chaque minute ici compte pour le jour J.',
  'Lentement, mais sûrement.',
  'Ton téléphone peut se reposer. Toi, tu avances.',
];

export default function FocusScreen() {
  const { data, justCompleted } = useStore();
  const timer = data.activeTimer;

  if (timer) return <ActiveSession timer={timer} />;
  if (justCompleted) return <Completed />;
  return <Idle />;
}

function Idle() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { data, startTimer, updateSettings } = useStore();
  const { subjects, sessions, exams, settings } = data;
  const now = useNow(60_000);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const selected = subjects.find((s) => s.id === pickedId) ?? subjects[0];

  const today = minutesOn(sessions, now);
  const streak = currentStreak(sessions, now);
  const nextExam = exams
    .map((e) => ({ ...e, days: daysUntil(e.date, now) }))
    .filter((e) => e.days >= 0)
    .sort((a, b) => a.days - b.days)[0];
  const date = new Date(now).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const dateLabel = date.charAt(0).toUpperCase() + date.slice(1);

  if (subjects.length === 0) {
    return (
      <Screen subtitle={dateLabel} title="Prêt à réviser ?">
        <ThemedText themeColor="textSecondary">
          Commence par ajouter les matières que tu révises.
        </ThemedText>
        <Button label="Ajouter une matière" onPress={() => router.navigate('/matieres')} />
      </Screen>
    );
  }

  return (
    <Screen subtitle={dateLabel} title="Prêt à réviser ?">
      <View style={styles.ringWrap}>
        <ProgressRing
          size={ringSize(width, 260, 120)}
          strokeWidth={6}
          progress={0}
          color={theme.accent}
          trackColor={theme.backgroundSelected}>
          <ThemedText style={styles.clock}>{formatClock(settings.focusMin * 60)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {selected?.name}
          </ThemedText>
        </ProgressRing>
      </View>

      <View style={styles.chips}>
        {subjects.map((s) => (
          <Chip
            key={s.id}
            label={s.name}
            color={s.color}
            selected={s.id === selected?.id}
            onPress={() => setPickedId(s.id)}
          />
        ))}
      </View>

      <Segmented
        options={DURATIONS}
        value={settings.focusMin}
        onChange={(focusMin) => updateSettings({ focusMin })}
      />

      <Button
        label="Commencer"
        disabled={!selected}
        onPress={() => selected && startTimer(selected.id, settings.focusMin)}
      />

      <SectionTitle>Aujourd&apos;hui</SectionTitle>
      <Group>
        <Row
          label="Temps de révision"
          value={`${formatDuration(today)} / ${formatDuration(settings.dailyGoalMin)}`}
          valueColor={today >= settings.dailyGoalMin ? theme.accent : undefined}
        />
        <Row
          label="Série"
          value={streak === 0 ? 'à lancer' : `${streak} jour${streak > 1 ? 's' : ''}`}
        />
        {nextExam && (
          <Row
            label={nextExam.name}
            detail="Prochain examen"
            value={nextExam.days === 0 ? 'Aujourd’hui' : `J-${nextExam.days}`}
            valueColor={theme.accent}
          />
        )}
      </Group>
    </Screen>
  );
}

/** Taille de l'anneau ; la largeur vaut 0 pendant le pré-rendu web. */
function ringSize(width: number, max: number, margin: number) {
  return Math.max(200, Math.min(max, width - margin));
}

/** Garde l'écran allumé pendant une séance (sans effet sur le web). */
function KeepAwake() {
  useKeepAwake();
  return null;
}

function ActiveSession({ timer }: { timer: ActiveTimer }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { data, stopTimer } = useStore();
  const now = useNow(1000);
  const [confirmAbandon, setConfirmAbandon] = useState(false);

  const isBreak = timer.kind === 'break';
  const subject = data.subjects.find((s) => s.id === timer.subjectId);
  const totalMs = timer.durationMin * 60_000;
  const remaining = Math.min(totalMs, timer.startedAt + totalMs - now) / 1000;
  const line = isBreak
    ? 'Lève-toi, bois un verre d’eau, respire.'
    : FOCUS_LINES[Math.floor(timer.startedAt / 1000) % FOCUS_LINES.length];

  return (
    <SafeAreaView style={[styles.immersive, { backgroundColor: theme.background }]}>
      {Platform.OS !== 'web' && <KeepAwake />}
      <View style={styles.immersiveTop}>
        {!isBreak && subject && <View style={[styles.dot, { backgroundColor: subject.color }]} />}
        <ThemedText type="small" themeColor="textSecondary" style={styles.caps}>
          {isBreak ? 'Pause' : (subject?.name ?? 'Révision')}
        </ThemedText>
      </View>

      <ProgressRing
        size={ringSize(width, 300, 64)}
        strokeWidth={4}
        progress={(now - timer.startedAt) / totalMs}
        color={isBreak ? theme.textSecondary : (subject?.color ?? theme.accent)}
        trackColor={theme.backgroundSelected}>
        <ThemedText style={styles.bigClock}>{formatClock(remaining)}</ThemedText>
      </ProgressRing>

      <ThemedText themeColor="textSecondary" style={styles.line}>
        {line}
      </ThemedText>

      <View style={styles.actions}>
        {isBreak ? (
          <Button label="Passer la pause" variant="plain" onPress={() => stopTimer(false)} />
        ) : (
          <>
            <Button
              label={confirmAbandon ? 'Vraiment abandonner ?' : 'Abandonner'}
              variant="danger"
              onPress={() => (confirmAbandon ? stopTimer(false) : setConfirmAbandon(true))}
            />
            <Button label="Terminer" variant="plain" onPress={() => stopTimer(true)} />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function Completed() {
  const theme = useTheme();
  const { data, justCompleted, dismissCompleted, startBreak } = useStore();
  const now = useNow(60_000);
  if (!justCompleted) return null;

  const subject = data.subjects.find((s) => s.id === justCompleted.subjectId);
  const today = minutesOn(data.sessions, now);
  const left = data.settings.dailyGoalMin - today;

  return (
    <SafeAreaView style={[styles.immersive, { backgroundColor: theme.background }]}>
      <View style={styles.completed}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.caps}>
          Séance terminée
        </ThemedText>
        <ThemedText style={styles.completedTitle}>Bien joué.</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.line}>
          {formatDuration(justCompleted.durationMin)} de {subject?.name ?? 'révision'} en plus.{'\n'}
          {left > 0
            ? `Encore ${formatDuration(left)} pour ton objectif du jour.`
            : 'Objectif du jour atteint.'}
        </ThemedText>
      </View>
      <View style={styles.completedActions}>
        <Button label={`Pause de ${BREAK_MIN} min`} onPress={() => startBreak(BREAK_MIN)} />
        <Button label="Continuer sans pause" variant="plain" onPress={dismissCompleted} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ringWrap: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  clock: {
    fontSize: 52,
    lineHeight: 60,
    fontWeight: 200,
    fontVariant: ['tabular-nums'],
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  caps: {
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontSize: 12,
  },
  immersive: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.five,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset,
  },
  immersiveTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  bigClock: {
    fontSize: 68,
    lineHeight: 78,
    fontWeight: 200,
    fontVariant: ['tabular-nums'],
  },
  line: {
    textAlign: 'center',
    maxWidth: 300,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
  completed: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  completedTitle: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: 300,
    letterSpacing: -0.5,
  },
  completedActions: {
    width: '100%',
    maxWidth: 400,
    gap: Spacing.two,
  },
});
