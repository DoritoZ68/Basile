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
import { FREE_MAX_FOCUS, ScreenSettingsButton } from '@/components/settings-sheet';
import { ThemedText } from '@/components/themed-text';
import { MethodCard } from '@/components/method-card';
import { TaskRow } from '@/components/task-row';
import { TreeRings, type RingSession } from '@/components/tree-rings';
import {
  Button,
  Chip,
  Grid,
  Group,
  Panel,
  Screen,
  Segmented,
  SectionTitle,
  TextLink,
} from '@/components/ui';
import { BottomTabInset, Display, HeaderInset, Spacing } from '@/constants/theme';
import { useHydrated } from '@/hooks/use-layout';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { dueCards, masteredCount } from '@/lib/leitner';
import { methodOfTheDay } from '@/lib/methods';
import {
  currentStreak,
  dayKey,
  daysUntil,
  formatClock,
  formatDate,
  formatDuration,
  minutesOn,
  weekBars,
} from '@/lib/stats';
import { usePro } from '@/lib/pro';
import { SOUND_SUPPORTED } from '@/lib/sound';
import { timerElapsed, timerEndsAt, useStore } from '@/lib/store';
import type { ActiveTimer, AppData, Exam, SoundId } from '@/lib/types';

const PRESETS = [15, 25, 45, 60];
/** Bleu clair de la jauge pendant une pause. */
const BREAK_COLOR = '#7FB2D9';
/** Valeur du segment « Perso » dans le choix de durée. */
const CUSTOM = -1;

const SOUNDS: { value: SoundId; label: string }[] = [
  { value: 'none', label: 'Silence' },
  { value: 'pluie', label: 'Pluie' },
  { value: 'brun', label: 'Bruit brun' },
  { value: 'blanc', label: 'Bruit blanc' },
];

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

/** « Bonjour », « Bon après-midi », « Bonsoir » selon l'heure. */
function greeting(now: number, name: string) {
  const h = new Date(now).getHours();
  const hello = h < 5 ? 'Bonne nuit' : h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
  return name ? `${hello}, ${name}.` : 'Prêt à réviser ?';
}

/** Nombre de séances de travail terminées aujourd'hui. */
function sessionsToday(data: AppData, now: number) {
  const today = dayKey(now);
  return data.sessions.filter((s) => dayKey(s.startedAt) === today).length;
}

function Idle() {
  const theme = useTheme();
  const { data, settings } = useStore();
  const { subjects, sessions, exams } = data;
  const now = useNow(60_000);

  const today = minutesOn(sessions, now);
  const rings = todayRings(data, now);
  const streak = currentStreak(sessions, now);
  const week = weekBars(sessions, now).reduce((sum, b) => sum + b.minutes, 0);
  const upcoming = exams
    .map((e) => ({ ...e, days: daysUntil(e.date, now) }))
    .filter((e) => e.days >= 0)
    .sort((a, b) => a.days - b.days);
  const date = new Date(now).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  // La date et l'heure ne sont pas connues au moment de générer le site : on les affiche au chargement.
  const hydrated = useHydrated();
  const dateLabel = hydrated ? date.charAt(0).toUpperCase() + date.slice(1) : ' ';
  const title = hydrated ? greeting(now, settings.name) : 'Prêt à réviser ?';

  if (subjects.length === 0) {
    return (
      <Screen subtitle={dateLabel} title={title} action={<ScreenSettingsButton />}>
        <Panel title="Commençons par tes matières">
          <ThemedText themeColor="textSecondary">
            Ajoute les matières que tu révises : chaque séance y sera rattachée et dessinera un
            cerne de sa couleur.
          </ThemedText>
          <Button label="Ajouter une matière" onPress={() => router.navigate('/matieres')} />
        </Panel>
      </Screen>
    );
  }

  return (
    <Screen subtitle={dateLabel} title={title} action={<ScreenSettingsButton />}>
      <Grid min={340}>
        <Panel style={styles.heroPanel}>
          <View style={styles.ringWrap}>
            <TreeRings size={220} sessions={rings} goalMinutes={settings.dailyGoalMin} />
            <View style={styles.trunkCaption}>
              <ThemedText style={styles.trunkValue}>
                {rings.length === 0 ? 'Ton premier cerne t’attend.' : formatDuration(today)}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
                {rings.length === 0
                  ? `Objectif du jour : ${formatDuration(settings.dailyGoalMin)}`
                  : `sur ${formatDuration(settings.dailyGoalMin)} · ${rings.length} cerne${rings.length > 1 ? 's' : ''} aujourd’hui`}
              </ThemedText>
            </View>
          </View>
          <View style={[styles.statsRow, { borderTopColor: theme.border }]}>
            <Stat label="Aujourd’hui" value={formatDuration(today)} />
            <Stat label="Cette semaine" value={formatDuration(week)} />
            <Stat label="Série" value={streak === 0 ? '—' : `${streak} j`} accent={streak > 0} />
          </View>
        </Panel>
        <StartPanel />
      </Grid>

      <Grid min={280}>
        <TodayTasksPanel now={now} />
        <CardsPanel now={now} />
        <ExamPanel exams={upcoming} />
      </Grid>

      <View style={styles.sectionHeader}>
        <SectionTitle>Méthode du jour</SectionTitle>
        <TextLink label="Toutes les méthodes ›" onPress={() => router.navigate('/methodes')} />
      </View>
      <Grid min={300}>
        <MethodCard method={methodOfTheDay(now)} />
        <MethodCard method={methodOfTheDay(now + 86_400_000 * 5)} />
      </Grid>
    </Screen>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  const theme = useTheme();
  return (
    <View style={styles.stat}>
      <ThemedText style={[styles.statValue, accent && { color: theme.accent }]}>{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

/** Choix de la matière et de la durée, puis lancement de la séance. */
function StartPanel() {
  const { data, settings, startTimer, updateSettings } = useStore();
  const { isPro, openPaywall } = usePro();
  const now = useNow(60_000);
  const { subjects } = data;
  // « Perso » : durée libre de 5 min à 2 h (au-delà de 60 min avec Bûcheur Pro).
  const [custom, setCustom] = useState(!PRESETS.includes(settings.focusMin));
  const durations = [
    ...PRESETS.map((d) => ({ value: d, label: `${d} min` })),
    { value: CUSTOM, label: 'Perso' },
  ];
  const [pickedId, setPickedId] = useState<string | null>(null);
  const selected = subjects.find((s) => s.id === pickedId) ?? subjects[0];
  const done = sessionsToday(data, now);
  const every = settings.breaks ? settings.longBreakEvery : 0;

  return (
    <Panel eyebrow="Nouvelle séance" title="Sur quoi travailles-tu ?">
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
      <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
        {every > 0
          ? `Séance ${(done % every) + 1} sur ${every} avant la pause longue · pauses de ${settings.breakMin} min`
          : settings.breaks
            ? `Une pause de ${settings.breakMin} min te sera proposée à la fin.`
            : 'Pauses désactivées dans les réglages.'}
      </ThemedText>
    </Panel>
  );
}

function TodayTasksPanel({ now }: { now: number }) {
  const { data } = useStore();
  const todayKey = dayKey(now);
  const todo = data.tasks
    .filter((t) => !t.done)
    .sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999') || a.createdAt - b.createdAt);
  const urgent = todo.filter((t) => t.due && t.due <= todayKey).length;
  return (
    <Panel
      eyebrow="Tâches"
      title={
        todo.length === 0
          ? 'Liste vide'
          : urgent > 0
            ? `${urgent} pour aujourd’hui`
            : `${todo.length} à faire`
      }
      action={<TextLink label="Tout voir ›" onPress={() => router.navigate('/taches')} />}>
      {todo.length === 0 ? (
        <ThemedText themeColor="textSecondary">
          Note ce que tu dois réviser, chapitre par chapitre, et coche au fur et à mesure.
        </ThemedText>
      ) : (
        <View style={styles.taskList}>
          {todo.slice(0, 3).map((t) => (
            <TaskRow key={t.id} task={t} now={now} />
          ))}
        </View>
      )}
      {todo.length === 0 && (
        <Button
          label="Ajouter une tâche"
          variant="glass"
          onPress={() => router.navigate('/taches')}
        />
      )}
    </Panel>
  );
}

function CardsPanel({ now }: { now: number }) {
  const { data } = useStore();
  const due = dueCards(data.cards, now).length;
  return (
    <Panel
      eyebrow="Fiches"
      title={
        data.cards.length === 0
          ? 'Mémoriser pour de bon'
          : due === 0
            ? 'Tout est à jour'
            : `${due} à revoir`
      }
      action={<TextLink label="Ouvrir ›" onPress={() => router.navigate('/fiches')} />}>
      <ThemedText themeColor="textSecondary">
        {data.cards.length === 0
          ? 'Crée des fiches question / réponse : Bûcheur te les repropose juste avant que tu les oublies.'
          : `${data.cards.length} fiche${data.cards.length > 1 ? 's' : ''} · ${masteredCount(data.cards)} acquise${masteredCount(data.cards) > 1 ? 's' : ''}. ${due > 0 ? 'Dix minutes suffisent.' : 'Reviens demain.'}`}
      </ThemedText>
      <Button
        label={
          data.cards.length === 0
            ? 'Créer une fiche'
            : due > 0
              ? 'Réviser maintenant'
              : 'Ajouter des fiches'
        }
        variant={due > 0 ? 'primary' : 'glass'}
        onPress={() => router.navigate('/fiches')}
      />
    </Panel>
  );
}

function ExamPanel({ exams }: { exams: (Exam & { days: number })[] }) {
  const theme = useTheme();
  const { data } = useStore();
  const next = exams[0];
  if (!next) {
    return (
      <Panel
        eyebrow="Examens"
        title="Aucun examen prévu"
        action={<TextLink label="Ajouter ›" onPress={() => router.navigate('/examens')} />}>
        <ThemedText themeColor="textSecondary">
          Ajoute tes dates d’examen pour suivre le compte à rebours et planifier à rebours.
        </ThemedText>
      </Panel>
    );
  }
  const subject = data.subjects.find((s) => s.id === next.subjectId);
  return (
    <Panel
      eyebrow="Prochain examen"
      title={next.name}
      action={<TextLink label="Tout voir ›" onPress={() => router.navigate('/examens')} />}>
      <View style={styles.countdown}>
        <ThemedText style={[styles.countdownValue, { color: subject?.color ?? theme.accent }]}>
          {next.days === 0 ? 'Jour J' : `J-${next.days}`}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatDate(next.date)}
          {subject ? ` · ${subject.name}` : ''}
        </ThemedText>
      </View>
      {exams.length > 1 && (
        <ThemedText type="small" themeColor="textSecondary">
          Puis :{' '}
          {exams
            .slice(1, 3)
            .map((e) => `${e.name} (J-${e.days})`)
            .join(', ')}
        </ThemedText>
      )}
    </Panel>
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
  const { data, settings, stopTimer, pauseTimer, resumeTimer, extendTimer, updateSettings } =
    useStore();
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
        {SOUND_SUPPORTED && !isBreak && (
          <View style={styles.sounds}>
            {SOUNDS.map((o) => (
              <Chip
                key={o.value}
                label={o.label}
                selected={settings.sound === o.value}
                onPress={() => updateSettings({ sound: o.value })}
              />
            ))}
          </View>
        )}
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
  // Cycle Pomodoro : une pause longue toutes les N séances de la journée.
  const every = settings.longBreakEvery;
  const longBreak = every > 0 && sessionsToday(data, now) % every === 0;
  const breakMin = longBreak ? settings.longBreakMin : settings.breakMin;

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
                  label={longBreak ? `Pause longue de ${breakMin} min` : `Pause de ${breakMin} min`}
                  onPress={() => startBreak(breakMin)}
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
    paddingTop: Spacing.two,
  },
  heroPanel: {
    flex: 1,
    justifyContent: 'space-between',
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: 600,
    fontVariant: ['tabular-nums'],
  },
  centerText: {
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingRight: Spacing.three,
  },
  taskList: {
    marginHorizontal: -Spacing.three,
  },
  countdown: {
    gap: 2,
  },
  countdownValue: {
    fontFamily: Display.title,
    fontWeight: 'normal',
    fontSize: 48,
    lineHeight: 56,
  },
  sounds: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  trunkCaption: {
    alignItems: 'center',
    gap: 2,
  },
  trunkValue: {
    textAlign: 'center',
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
    paddingTop: HeaderInset + Spacing.three,
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
    paddingTop: HeaderInset + Spacing.four,
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
