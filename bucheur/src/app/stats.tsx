import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Group, Row, Screen, SectionTitle, Stepper } from '@/components/ui';
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

const CHART_HEIGHT = 110;
const LABEL_HEIGHT = 22;

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
  const streak = currentStreak(sessions, now);
  const best = bestStreak(sessions);

  return (
    <Screen title="Statistiques">
      <View style={[styles.summary, { backgroundColor: theme.backgroundElement }]}>
        <Stat value={formatDuration(weekTotal)} label="Cette semaine" />
        <View style={[styles.vSeparator, { backgroundColor: theme.border }]} />
        <Stat value={`${streak} j`} label="Série" />
        <View style={[styles.vSeparator, { backgroundColor: theme.border }]} />
        <Stat value={`${best} j`} label="Record" />
      </View>

      <SectionTitle>Semaine en cours</SectionTitle>
      <View style={[styles.chartBox, { backgroundColor: theme.backgroundElement }]}>
        <View style={styles.chart}>
          <View
            style={[
              styles.goalLine,
              {
                bottom: (settings.dailyGoalMin / maxBar) * CHART_HEIGHT + LABEL_HEIGHT,
                borderColor: theme.textSecondary,
              },
            ]}
          />
          {bars.map((b) => (
            <View key={b.key} style={styles.barColumn}>
              <View
                accessibilityLabel={`${b.letter} : ${formatDuration(b.minutes)}`}
                style={[
                  styles.bar,
                  {
                    height: Math.max(3, (b.minutes / maxBar) * CHART_HEIGHT),
                    backgroundColor: b.minutes > 0 ? theme.accent : theme.backgroundSelected,
                    opacity: b.isToday || b.minutes === 0 ? 1 : 0.55,
                  },
                ]}
              />
              <ThemedText
                type={b.isToday ? 'smallBold' : 'small'}
                themeColor={b.isToday ? 'text' : 'textSecondary'}
                style={styles.barLabel}>
                {b.letter}
              </ThemedText>
            </View>
          ))}
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          Pointillés : objectif de {formatDuration(settings.dailyGoalMin)} par jour
        </ThemedText>
      </View>

      {bySubject.length > 0 && (
        <>
          <SectionTitle>Par matière</SectionTitle>
          <Group>
            {bySubject.map(([id, minutes]) => (
              <Row
                key={id}
                label={subject(id)?.name ?? 'Matière supprimée'}
                color={subject(id)?.color ?? theme.textSecondary}
                value={formatDuration(minutes)}
              />
            ))}
          </Group>
        </>
      )}

      <SectionTitle>Réglages</SectionTitle>
      <Group>
        <Stepper
          label="Objectif quotidien"
          value={formatDuration(settings.dailyGoalMin)}
          onMinus={() => updateSettings({ dailyGoalMin: Math.max(15, settings.dailyGoalMin - 15) })}
          onPlus={() => updateSettings({ dailyGoalMin: settings.dailyGoalMin + 15 })}
        />
      </Group>

      <SectionTitle>Dernières séances · {formatDuration(total)} au total</SectionTitle>
      {recent.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          Pas encore de séance. Ta première t&apos;attend dans l&apos;onglet Focus.
        </ThemedText>
      ) : (
        <>
          <Group>
            {recent.map((s) => {
              const confirming = confirmDeleteId === s.id;
              return (
                <Row
                  key={s.id}
                  label={subject(s.subjectId)?.name ?? 'Matière supprimée'}
                  color={subject(s.subjectId)?.color ?? theme.textSecondary}
                  detail={new Date(s.startedAt).toLocaleString('fr-FR', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  value={confirming ? 'Supprimer ?' : formatDuration(s.durationMin)}
                  valueColor={confirming ? theme.danger : undefined}
                  onPress={() => {
                    if (!confirming) return setConfirmDeleteId(s.id);
                    removeSession(s.id);
                    setConfirmDeleteId(null);
                  }}
                />
              );
            })}
          </Group>
          <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
            Touche une séance deux fois pour la supprimer.
          </ThemedText>
        </>
      )}
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    borderRadius: 16,
    paddingVertical: Spacing.three,
  },
  vSeparator: {
    width: StyleSheet.hairlineWidth,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: 300,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    marginLeft: Spacing.three,
  },
  chartBox: {
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CHART_HEIGHT + LABEL_HEIGHT,
  },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    opacity: 0.5,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: 14,
    borderRadius: 7,
  },
  barLabel: {
    height: LABEL_HEIGHT,
    lineHeight: LABEL_HEIGHT,
  },
});
