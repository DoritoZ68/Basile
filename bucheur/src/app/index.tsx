import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Chip, ProgressBar, Screen, SectionTitle } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { currentStreak, daysUntil, formatClock, formatDuration, minutesOn } from '@/lib/stats';
import { useStore } from '@/lib/store';

const DURATIONS = [15, 25, 45, 60];

export default function FocusScreen() {
  const theme = useTheme();
  const { data, justCompleted, dismissCompleted, startTimer, stopTimer, updateSettings } = useStore();
  const { subjects, sessions, exams, activeTimer, settings } = data;
  const now = useNow(activeTimer ? 1000 : 60_000);

  const [pickedId, setPickedId] = useState<string | null>(null);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const selectedId = subjects.some((s) => s.id === pickedId) ? pickedId : (subjects[0]?.id ?? null);

  const streak = currentStreak(sessions, now);
  const today = minutesOn(sessions, now);
  const nextExam = exams
    .map((e) => ({ ...e, days: daysUntil(e.date, now) }))
    .filter((e) => e.days >= 0)
    .sort((a, b) => a.days - b.days)[0];
  const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name ?? 'Matière supprimée';
  const subjectColor = (id: string) => subjects.find((s) => s.id === id)?.color ?? theme.textSecondary;

  return (
    <Screen title="Focus">
      <View style={styles.row}>
        <Card style={styles.statCard}>
          <ThemedText style={styles.statValue}>🔥 {streak}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {streak > 1 ? 'jours de suite' : 'jour de suite'}
          </ThemedText>
        </Card>
        <Card style={styles.statCard}>
          <ThemedText style={styles.statValue}>{formatDuration(today)}</ThemedText>
          <ProgressBar value={today / settings.dailyGoalMin} />
          <ThemedText type="small" themeColor="textSecondary">
            sur {formatDuration(settings.dailyGoalMin)} aujourd&apos;hui
          </ThemedText>
        </Card>
      </View>

      {nextExam && (
        <Card style={styles.examCard}>
          <ThemedText style={[styles.examDays, { color: theme.accent }]}>
            {nextExam.days === 0 ? 'Jour J' : `J-${nextExam.days}`}
          </ThemedText>
          <View style={styles.flex}>
            <ThemedText type="smallBold">{nextExam.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {nextExam.days === 0 ? "C'est aujourd'hui, tu vas assurer !" : 'Prochain examen'}
            </ThemedText>
          </View>
        </Card>
      )}

      {justCompleted && (
        <Card style={{ borderColor: theme.accent }}>
          <ThemedText type="smallBold">Séance terminée 🎉</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatDuration(justCompleted.durationMin)} de {subjectName(justCompleted.subjectId)}{' '}
            enregistrées. Prends 5 minutes de pause avant la suite.
          </ThemedText>
          <Button label="Super !" variant="secondary" onPress={dismissCompleted} />
        </Card>
      )}

      {activeTimer ? (
        <Card style={styles.timerCard}>
          <View style={styles.subjectRow}>
            <View style={[styles.dot, { backgroundColor: subjectColor(activeTimer.subjectId) }]} />
            <ThemedText type="smallBold">{subjectName(activeTimer.subjectId)}</ThemedText>
          </View>
          <ThemedText style={styles.clock}>
            {formatClock(
              Math.min(
                activeTimer.durationMin * 60,
                (activeTimer.startedAt + activeTimer.durationMin * 60_000 - now) / 1000,
              ),
            )}
          </ThemedText>
          <ProgressBar
            value={(now - activeTimer.startedAt) / (activeTimer.durationMin * 60_000)}
            color={subjectColor(activeTimer.subjectId)}
          />
          <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
            Pose ton téléphone, on te prévient à la fin.
          </ThemedText>
          <Button
            label="Terminer et enregistrer"
            variant="secondary"
            onPress={() => {
              setConfirmAbandon(false);
              stopTimer(true);
            }}
          />
          <Button
            label={confirmAbandon ? 'Confirmer : ne rien enregistrer' : 'Abandonner'}
            variant="danger"
            onPress={() => {
              if (!confirmAbandon) return setConfirmAbandon(true);
              setConfirmAbandon(false);
              stopTimer(false);
            }}
          />
        </Card>
      ) : subjects.length === 0 ? (
        <Card>
          <ThemedText type="smallBold">Aucune matière pour l&apos;instant</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Ajoute les matières que tu révises pour lancer ta première séance.
          </ThemedText>
          <Button label="Ajouter une matière" onPress={() => router.navigate('/matieres')} />
        </Card>
      ) : (
        <Card style={styles.timerCard}>
          <ThemedText style={styles.clock}>{formatClock(settings.focusMin * 60)}</ThemedText>

          <SectionTitle>Matière</SectionTitle>
          <View style={styles.chips}>
            {subjects.map((s) => (
              <Chip
                key={s.id}
                label={s.name}
                color={s.color}
                selected={s.id === selectedId}
                onPress={() => setPickedId(s.id)}
              />
            ))}
          </View>

          <SectionTitle>Durée</SectionTitle>
          <View style={styles.chips}>
            {DURATIONS.map((d) => (
              <Chip
                key={d}
                label={`${d} min`}
                selected={d === settings.focusMin}
                onPress={() => updateSettings({ focusMin: d })}
              />
            ))}
          </View>

          <Button
            label="Lancer la séance"
            style={styles.startButton}
            disabled={!selectedId}
            onPress={() => selectedId && startTimer(selectedId, settings.focusMin)}
          />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  flex: {
    flex: 1,
  },
  statCard: {
    flex: 1,
    gap: Spacing.two,
  },
  statValue: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: 700,
  },
  examCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  examDays: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: 800,
    minWidth: 76,
  },
  timerCard: {
    gap: Spacing.three,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  clock: {
    fontSize: 72,
    lineHeight: 84,
    fontWeight: 700,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  center: {
    textAlign: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  startButton: {
    marginTop: Spacing.two,
  },
});
