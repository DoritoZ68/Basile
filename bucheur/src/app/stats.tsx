import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card, ProgressBar, Screen, SectionTitle, Stepper } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import {
  bestStreak,
  currentStreak,
  formatDuration,
  weekBars,
  weekMinutesBySubject,
} from '@/lib/stats';
import { useStore } from '@/lib/store';

const CHART_HEIGHT = 120;

export default function StatsScreen() {
  const theme = useTheme();
  const { data, updateSettings, removeSession } = useStore();
  const { sessions, subjects, settings } = data;
  const now = useNow(60_000);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const bars = weekBars(sessions, now);
  const weekTotal = bars.reduce((sum, b) => sum + b.minutes, 0);
  const maxBar = Math.max(settings.dailyGoalMin, ...bars.map((b) => b.minutes));
  const bySubject = [...weekMinutesBySubject(sessions, now).entries()].sort((a, b) => b[1] - a[1]);
  const total = sessions.reduce((sum, s) => sum + s.durationMin, 0);
  const recent = [...sessions].sort((a, b) => b.startedAt - a.startedAt).slice(0, 10);
  const subject = (id: string) => subjects.find((s) => s.id === id);

  return (
    <Screen title="Stats">
      <View style={styles.row}>
        <Stat value={formatDuration(weekTotal)} label="cette semaine" />
        <Stat value={`🔥 ${currentStreak(sessions, now)}`} label="série actuelle" />
        <Stat value={`🏆 ${bestStreak(sessions)}`} label="meilleure série" />
      </View>

      <Card>
        <ThemedText type="smallBold">Semaine en cours</ThemedText>
        <View style={styles.chart}>
          <View
            style={[
              styles.goalLine,
              { bottom: (settings.dailyGoalMin / maxBar) * CHART_HEIGHT + 20, borderColor: theme.border },
            ]}
          />
          {bars.map((b) => (
            <View key={b.key} style={styles.barColumn}>
              <View
                accessibilityLabel={`${b.letter} : ${formatDuration(b.minutes)}`}
                style={[
                  styles.bar,
                  {
                    height: Math.max(4, (b.minutes / maxBar) * CHART_HEIGHT),
                    backgroundColor: b.minutes > 0 ? theme.accent : theme.backgroundSelected,
                    opacity: b.isToday || b.minutes === 0 ? 1 : 0.6,
                  },
                ]}
              />
              <ThemedText
                type="smallBold"
                themeColor={b.isToday ? 'text' : 'textSecondary'}
                style={styles.barLabel}>
                {b.letter}
              </ThemedText>
            </View>
          ))}
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          Ligne pointillée : objectif de {formatDuration(settings.dailyGoalMin)} par jour.
        </ThemedText>
      </Card>

      {bySubject.length > 0 && (
        <Card>
          <ThemedText type="smallBold">Par matière (semaine)</ThemedText>
          {bySubject.map(([id, minutes]) => (
            <View key={id} style={styles.subjectStat}>
              <View style={styles.subjectStatHeader}>
                <ThemedText type="small">{subject(id)?.name ?? 'Matière supprimée'}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {formatDuration(minutes)}
                </ThemedText>
              </View>
              <ProgressBar value={minutes / weekTotal} color={subject(id)?.color ?? theme.textSecondary} />
            </View>
          ))}
        </Card>
      )}

      <SectionTitle>Réglages</SectionTitle>
      <Card>
        <Stepper
          label="Objectif quotidien"
          value={formatDuration(settings.dailyGoalMin)}
          onMinus={() => updateSettings({ dailyGoalMin: Math.max(15, settings.dailyGoalMin - 15) })}
          onPlus={() => updateSettings({ dailyGoalMin: settings.dailyGoalMin + 15 })}
        />
      </Card>

      <SectionTitle>Dernières séances · {formatDuration(total)} au total</SectionTitle>
      {recent.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Pas encore de séance. Lance ton premier minuteur depuis l&apos;onglet Focus !
        </ThemedText>
      ) : (
        <Card style={styles.history}>
          {recent.map((s) => (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              accessibilityHint="Appuie deux fois pour supprimer cette séance"
              onPress={() => {
                if (confirmDeleteId !== s.id) return setConfirmDeleteId(s.id);
                removeSession(s.id);
                setConfirmDeleteId(null);
              }}
              style={styles.historyRow}>
              <View style={[styles.dot, { backgroundColor: subject(s.subjectId)?.color ?? theme.textSecondary }]} />
              <View style={styles.flex}>
                <ThemedText type="small">{subject(s.subjectId)?.name ?? 'Matière supprimée'}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {new Date(s.startedAt).toLocaleString('fr-FR', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </ThemedText>
              </View>
              <ThemedText
                type="smallBold"
                style={confirmDeleteId === s.id ? { color: theme.danger } : undefined}>
                {confirmDeleteId === s.id ? 'Supprimer ?' : formatDuration(s.durationMin)}
              </ThemedText>
            </Pressable>
          ))}
        </Card>
      )}
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <Card style={styles.stat}>
      <ThemedText style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  stat: {
    flex: 1,
    gap: Spacing.one,
    padding: Spacing.three - 4,
  },
  statValue: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 700,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: CHART_HEIGHT + 20,
  },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '55%',
    borderRadius: 6,
  },
  barLabel: {
    height: 20,
    lineHeight: 20,
  },
  subjectStat: {
    gap: Spacing.one,
  },
  subjectStatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  history: {
    gap: Spacing.two,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
