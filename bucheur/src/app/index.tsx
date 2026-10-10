import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ambient } from '@/components/ambient';
import { ProgressGauge } from '@/components/progress-gauge';
import { FREE_MAX_FOCUS, SettingsButton } from '@/components/settings-sheet';
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
import { timerElapsed, timerEndsAt, useStore } from '@/lib/store';
import type { ActiveTimer, AppData } from '@/lib/types';

const PRESETS = [15, 25, 45, 60];
/** Bleu clair de la jauge pendant une pause. */
const BREAK_COLOR = '#7FB2D9';
/** Valeur du segment « Perso » dans le choix de durée. */
const CUSTOM = -1;

const FOCUS_LEVELS = [
  { value: 1 as const, label: 'Difficile' },
  { value: 2 as const, label: 'Correcte' },
  { value: 3 as const, label: 'Excellente' },
];

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
  const { data, settings, startTimer, updateSettings } = useStore();
  const { isPro, openPaywall } = usePro();
  const { subjects, sessions, exams } = data;
  // « Perso » : durée libre de 5 min à 2 h (au-delà de 60 min avec Bûcheur Pro).
  const [custom, setCustom] = useState(!PRESETS.includes(settings.focusMin));
  const durations = [
    ...PRESETS.map((d) => ({ value: d, label: `${d} min` })),
    { value: CUSTOM, label: 'Perso' },
  ];
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
      <Screen subtitle={dateLabel} title="Prêt à réviser ?" action={<SettingsButton />}>
        <ThemedText themeColor="textSecondary">
          Commence par ajouter les matières que tu révises.
        </ThemedText>
        <Button label="Ajouter une matière" onPress={() => router.navigate('/matieres')} />
      </Screen>
    );
  }

  return (
    <Screen subtitle={dateLabel} title="Prêt à réviser ?" action={<SettingsButton />}>
      <View style={styles.ringWrap}>
        <TreeRings size={240} sessions={rings} goalMinutes={settings.dailyGoalMin} />
        <View style={styles.trunkCaption}>
          <ThemedText style={styles.trunkValue}>
            {rings.length === 0 ? 'Chaque minute compte.' : formatDuration(today)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {rings.length === 0
              ? `Objectif du jour : ${formatDuration(settings.dailyGoalMin)} · lance ta première séance`
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
        value={custom ? CUSTOM : settings.focusMin}
        onChange={(focusMin) => {
          setCustom(focusMin === CUSTOM);
          if (focusMin !== CUSTOM) updateSettings({ focusMin });
        }}
      />
      {custom && (
        <Group>
          <DurationInput
            minutes={settings.focusMin}
            max={isPro ? 120 : FREE_MAX_FOCUS}
            onChange={(focusMin) => updateSettings({ focusMin })}
            onOverLimit={openPaywall}
          />
        </Group>
      )}

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
        {nextExam ? (
          <Row
            label={nextExam.name}
            detail="Prochain examen"
            value={nextExam.days === 0 ? 'Aujourd’hui' : `J-${nextExam.days}`}
            valueColor={theme.accent}
          />
        ) : (
          <Row
            label="Aucun examen programmé"
            detail="Ajoute-en un pour suivre le compte à rebours."
            value="Ajouter ›"
            valueColor={theme.accent}
            onPress={() => router.navigate('/examens')}
          />
        )}
      </Group>
    </Screen>
  );
}

type DurationInputProps = {
  minutes: number;
  /** Durée maximale autorisée (60 min sans Bûcheur Pro, 2 h avec). */
  max: number;
  onChange: (minutes: number) => void;
  /** Appelé quand l'utilisateur dépasse la limite gratuite. */
  onOverLimit: () => void;
};

/** Durée personnalisée : champ en minutes, avec − et + par pas de 5. */
function DurationInput({ minutes, max, onChange, onOverLimit }: DurationInputProps) {
  const theme = useTheme();
  const [text, setText] = useState(String(minutes));
  const apply = (value: number) => {
    if (Number.isNaN(value)) return setText(String(minutes));
    if (value > max) {
      if (max < 120) onOverLimit();
      value = max;
    }
    const clamped = Math.max(5, Math.round(value));
    onChange(clamped);
    setText(String(clamped));
  };
  const step = (delta: number) => apply(minutes + delta);

  return (
    <View style={styles.durationRow}>
      <ThemedText style={styles.flex}>Durée en minutes</ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Diminuer"
        onPress={() => step(-5)}
        style={({ pressed }) => [
          styles.stepButton,
          { backgroundColor: theme.backgroundSelected, opacity: pressed ? 0.6 : 1 },
        ]}>
        <ThemedText style={styles.stepLabel}>−</ThemedText>
      </Pressable>
      <TextInput
        value={text}
        onChangeText={(t) => setText(t.replace(/[^0-9]/g, '').slice(0, 3))}
        onEndEditing={() => apply(parseInt(text, 10))}
        onBlur={() => apply(parseInt(text, 10))}
        onSubmitEditing={() => apply(parseInt(text, 10))}
        keyboardType="number-pad"
        returnKeyType="done"
        selectTextOnFocus
        accessibilityLabel="Durée de la séance en minutes"
        style={[
          styles.durationInput,
          { color: theme.text, backgroundColor: theme.backgroundSelected },
        ]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Augmenter"
        onPress={() => step(5)}
        style={({ pressed }) => [
          styles.stepButton,
          { backgroundColor: theme.backgroundSelected, opacity: pressed ? 0.6 : 1 },
        ]}>
        <ThemedText style={styles.stepLabel}>+</ThemedText>
      </Pressable>
    </View>
  );
}

/** Garde l'écran allumé pendant une séance (sans effet sur le web). */
function KeepAwake() {
  useKeepAwake();
  return null;
}

function ActiveSession({ timer }: { timer: ActiveTimer }) {
  const theme = useTheme();
  const { data, settings, stopTimer, pauseTimer, resumeTimer, extendTimer } = useStore();
  const now = useNow(1000);
  const [confirmAbandon, setConfirmAbandon] = useState(false);

  const isBreak = timer.kind === 'break';
  const paused = timer.pausedAt !== undefined;
  const subject = data.subjects.find((s) => s.id === timer.subjectId);
  const totalMs = timer.durationMin * 60_000;
  const remaining = Math.min(totalMs, timerEndsAt(timer) - (timer.pausedAt ?? now)) / 1000;
  const line = paused
    ? 'En pause. Reprends quand tu es prêt.'
    : isBreak
      ? 'Lève-toi, bois un verre d’eau, respire.'
      : settings.quotes
        ? FOCUS_LINES[Math.floor(timer.startedAt / 1000) % FOCUS_LINES.length]
        : null;

  return (
    <SafeAreaView style={styles.flex}>
      <Ambient />
      {Platform.OS !== 'web' && settings.keepAwake && <KeepAwake />}
      <ScrollView contentContainerStyle={styles.immersive} showsVerticalScrollIndicator={false}>
        <View style={styles.immersiveTop}>
          {!isBreak && subject && <View style={[styles.dot, { backgroundColor: subject.color }]} />}
          <ThemedText type="small" themeColor="textSecondary" style={styles.caps}>
            {isBreak ? 'Pause' : (subject?.name ?? 'Révision')}
          </ThemedText>
        </View>

        <View style={styles.sessionCenter}>
          <View style={styles.gaugeWrap}>
            <ProgressGauge
              size={240}
              progress={timerElapsed(timer, now) / totalMs}
              color={isBreak ? BREAK_COLOR : (subject?.color ?? theme.accent)}
            />
            <TreeRings
              size={186}
              sessions={todayRings(data, now)}
              goalMinutes={settings.dailyGoalMin}
              growing={
                isBreak
                  ? undefined
                  : {
                      color: subject?.color ?? theme.accent,
                      minutes: timer.durationMin,
                      progress: timerElapsed(timer, now) / totalMs,
                    }
              }
            />
          </View>
          <ThemedText
            themeColor={paused ? 'textSecondary' : 'text'}
            style={styles.bigClock}
            accessibilityLabel={`${formatClock(remaining)} restantes${paused ? ', en pause' : ''}`}>
            {formatClock(remaining)}
          </ThemedText>
        </View>

        {line && (
          <ThemedText themeColor="textSecondary" style={styles.line}>
            {line}
          </ThemedText>
        )}

        <View style={styles.controls}>
          <View style={styles.actions}>
            <Button
              label={paused ? 'Reprendre' : 'Pause'}
              variant={paused ? 'primary' : 'glass'}
              onPress={() => (paused ? resumeTimer() : pauseTimer())}
            />
            <Button label="+5 min" variant="glass" onPress={() => extendTimer(5)} />
          </View>
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Completed() {
  const theme = useTheme();
  const { data, settings, justCompleted, dismissCompleted, startBreak, updateSession } = useStore();
  const now = useNow(60_000);
  const [note, setNote] = useState(justCompleted?.note ?? '');
  if (!justCompleted) return null;

  const subject = data.subjects.find((s) => s.id === justCompleted.subjectId);
  const today = minutesOn(data.sessions, now);
  const left = settings.dailyGoalMin - today;

  return (
    <SafeAreaView style={styles.flex}>
      <Ambient />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.completedScroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          <TreeRings
            size={180}
            sessions={todayRings(data, now)}
            goalMinutes={settings.dailyGoalMin}
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

          <View style={styles.review}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.reviewLabel}>
              Ta concentration
            </ThemedText>
            <Segmented
              options={FOCUS_LEVELS}
              value={justCompleted.focus ?? 0}
              onChange={(focus) => focus !== 0 && updateSession(justCompleted.id, { focus })}
            />
            <Group>
              <TextInput
                value={note}
                onChangeText={(text) => {
                  setNote(text);
                  updateSession(justCompleted.id, { note: text.trim() || undefined });
                }}
                placeholder="Ce que tu as révisé (facultatif)"
                placeholderTextColor={theme.textSecondary}
                maxLength={120}
                returnKeyType="done"
                style={[styles.noteInput, { color: theme.text }]}
              />
            </Group>
          </View>

          <View style={styles.completedActions}>
            {settings.breaks ? (
              <>
                <Button
                  label={`Pause de ${settings.breakMin} min`}
                  onPress={() => startBreak(settings.breakMin)}
                />
                <Button label="Continuer sans pause" variant="glass" onPress={dismissCompleted} />
              </>
            ) : (
              <Button label="Continuer" onPress={dismissCompleted} />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  gaugeWrap: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    paddingVertical: 8,
  },
  stepLabel: {
    fontSize: 20,
    lineHeight: 24,
  },
  durationInput: {
    width: 64,
    fontSize: 20,
    fontWeight: 600,
    textAlign: 'center',
    borderRadius: 12,
    paddingVertical: 6,
  },
  stepButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  immersiveTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  bigClock: {
    fontSize: 54,
    lineHeight: 60,
    fontWeight: 200,
    fontVariant: ['tabular-nums'],
  },
  line: {
    textAlign: 'center',
    maxWidth: 300,
  },
  flex: {
    flex: 1,
  },
  controls: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  completedScroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  review: {
    width: '100%',
    maxWidth: 400,
    gap: Spacing.two,
  },
  reviewLabel: {
    textAlign: 'center',
  },
  noteInput: {
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: Spacing.three,
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
