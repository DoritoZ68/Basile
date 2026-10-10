import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ambient } from '@/components/ambient';
import { ThemedText } from '@/components/themed-text';
import { TreeRings, type RingSession } from '@/components/tree-rings';
import { Button, Chip, Group, Row, Screen, Segmented, SectionTitle } from '@/components/ui';
import { BottomTabInset, Display, Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import {
  currentStreak,
  dayKey,
  daysUntil,
  formatClock,
  formatDuration,
  minutesOn,
} from '@/lib/stats';
import { usePro } from '@/lib/pro';
import { useStore } from '@/lib/store';
import type { ActiveTimer, AppData } from '@/lib/types';

const BREAK_MIN = 5;

const FOCUS_LINES = [
  'Une page après l’autre.',
  'Le plus dur était de commencer. C’est fait.',
  'Reste sur cette tâche, le reste peut attendre.',
  'Chaque minute ici compte pour le jour J.',
  'Lentement, mais sûrement.',
  'Ton téléphone peut se reposer. Toi, tu avances.',
];

/** Les séances du jour, dans l'ordre, sous forme de cernes. */
function todayRings({ sessions, subjects }: AppData, now: number): RingSession[] {
  const today = dayKey(now);
  return sessions
    .filter((s) => dayKey(s.startedAt) === today)
    .sort((a, b) => a.startedAt - b.startedAt)
    .map((s) => ({
      key: s.id,
      minutes: s.durationMin,
      color: subjects.find((sub) => sub.id === s.subjectId)?.color ?? '#9A968F',
    }));
}

export default function FocusScreen() {
  const { data, justCompleted } = useStore();
  const timer = data.activeTimer;

  if (timer) return <ActiveSession timer={timer} />;
  if (justCompleted) return <Completed />;
  return <Idle />;
}

function Idle() {
  const theme = useTheme();
  const { data, startTimer, updateSettings } = useStore();
  const { isPro, openPaywall } = usePro();
  // La séance de 90 minutes fait partie de Bûcheur Pro.
  const durations = [15, 25, 45, 60, 90].map((d) => ({
    value: d,
    label: d === 90 && !isPro ? '90 · Pro' : `${d} min`,
  }));
  const { subjects, sessions, exams, settings } = data;
  const now = useNow(60_000);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const selected = subjects.find((s) => s.id === pickedId) ?? subjects[0];

  const today = minutesOn(sessions, now);
  const rings = todayRings(data, now);
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
        <TreeRings size={240} sessions={rings} goalMinutes={settings.dailyGoalMin} />
        <View style={styles.trunkCaption}>
          <ThemedText style={styles.trunkValue}>
            {rings.length === 0 ? 'Ton premier cerne t’attend.' : formatDuration(today)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {rings.length === 0
              ? `Objectif du jour : ${formatDuration(settings.dailyGoalMin)}`
              : `sur ${formatDuration(settings.dailyGoalMin)} · ${rings.length} cerne${rings.length > 1 ? 's' : ''} aujourd’hui`}
          </ThemedText>
        </View>
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
        options={durations}
        value={settings.focusMin}
        onChange={(focusMin) =>
          focusMin === 90 && !isPro ? openPaywall() : updateSettings({ focusMin })
        }
      />

      <Button
        label={`Commencer · ${settings.focusMin} min`}
        disabled={!selected}
        onPress={() => selected && startTimer(selected.id, settings.focusMin)}
      />

      <SectionTitle>En ce moment</SectionTitle>
      <Group>
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

/** Garde l'écran allumé pendant une séance (sans effet sur le web). */
function KeepAwake() {
  useKeepAwake();
  return null;
}

function ActiveSession({ timer }: { timer: ActiveTimer }) {
  const theme = useTheme();
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
    <SafeAreaView style={styles.immersive}>
      <Ambient />
      {Platform.OS !== 'web' && <KeepAwake />}
      <View style={styles.immersiveTop}>
        {!isBreak && subject && <View style={[styles.dot, { backgroundColor: subject.color }]} />}
        <ThemedText type="small" themeColor="textSecondary" style={styles.caps}>
          {isBreak ? 'Pause' : (subject?.name ?? 'Révision')}
        </ThemedText>
      </View>

      <View style={styles.sessionCenter}>
        <TreeRings
          size={260}
          sessions={todayRings(data, now)}
          goalMinutes={data.settings.dailyGoalMin}
          growing={
            isBreak
              ? undefined
              : {
                  color: subject?.color ?? theme.accent,
                  minutes: timer.durationMin,
                  progress: (now - timer.startedAt) / totalMs,
                }
          }
        />
        <ThemedText style={styles.bigClock}>{formatClock(remaining)}</ThemedText>
      </View>

      <ThemedText themeColor="textSecondary" style={styles.line}>
        {line}
      </ThemedText>

      <View style={styles.actions}>
        {isBreak ? (
          <Button label="Passer la pause" variant="glass" onPress={() => stopTimer(false)} />
        ) : (
          <>
            <Button
              label={confirmAbandon ? 'Vraiment ?' : 'Abandonner'}
              variant="glass"
              color={theme.danger}
              onPress={() => (confirmAbandon ? stopTimer(false) : setConfirmAbandon(true))}
            />
            <Button label="Terminer" variant="glass" onPress={() => stopTimer(true)} />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function Completed() {
  const { data, justCompleted, dismissCompleted, startBreak } = useStore();
  const now = useNow(60_000);
  if (!justCompleted) return null;

  const subject = data.subjects.find((s) => s.id === justCompleted.subjectId);
  const today = minutesOn(data.sessions, now);
  const left = data.settings.dailyGoalMin - today;

  return (
    <SafeAreaView style={styles.immersive}>
      <Ambient />
      <TreeRings
        size={220}
        sessions={todayRings(data, now)}
        goalMinutes={data.settings.dailyGoalMin}
      />
      <View style={styles.completed}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.caps}>
          Séance terminée
        </ThemedText>
        <ThemedText style={styles.completedTitle}>Un cerne de plus.</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.line}>
          {formatDuration(justCompleted.durationMin)} de {subject?.name ?? 'révision'} en plus.
          {'\n'}
          {left > 0
            ? `Encore ${formatDuration(left)} pour ton objectif du jour.`
            : 'Objectif du jour atteint.'}
        </ThemedText>
      </View>
      <View style={styles.completedActions}>
        <Button label={`Pause de ${BREAK_MIN} min`} onPress={() => startBreak(BREAK_MIN)} />
        <Button label="Continuer sans pause" variant="glass" onPress={dismissCompleted} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ringWrap: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingBottom: Spacing.two,
  },
  trunkCaption: {
    alignItems: 'center',
    gap: 2,
  },
  trunkValue: {
    fontFamily: Display.italic,
    fontWeight: 'normal',
    fontSize: 24,
    lineHeight: 32,
  },
  sessionCenter: {
    alignItems: 'center',
    gap: Spacing.three,
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
    fontSize: 64,
    lineHeight: 74,
    fontWeight: 200,
    fontVariant: ['tabular-nums'],
  },
  line: {
    textAlign: 'center',
    maxWidth: 300,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  completed: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  completedTitle: {
    fontFamily: Display.italic,
    fontWeight: 'normal',
    fontSize: 38,
    lineHeight: 48,
  },
  completedActions: {
    width: '100%',
    maxWidth: 400,
    gap: Spacing.two,
  },
});
