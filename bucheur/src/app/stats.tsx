import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Glass } from '@/components/glass';
import { ThemedText } from '@/components/themed-text';
import { TreeRings } from '@/components/tree-rings';
import { SettingsButton } from '@/components/settings-sheet';
import { Group, Row, Screen, SectionTitle } from '@/components/ui';
import { Display, Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import {
  bestStreak,
  currentStreak,
  addDays,
  dayKey,
  formatDuration,
  startOfWeek,
  weekBars,
  weekMinutesBySubject,
} from '@/lib/stats';
import { usePro } from '@/lib/pro';
import { useStore } from '@/lib/store';

const FOCUS_LABELS = {
  1: 'Concentration difficile',
  2: 'Concentration correcte',
  3: 'Excellente concentration',
};

export default function StatsScreen() {
  const theme = useTheme();
  const { data, settings, removeSession } = useStore();
  const { sessions, subjects } = data;
  const now = useNow(60_000);
  // Largeur mesurée de la rangée, partagée entre les 7 rondelles.
  const [weekWidth, setWeekWidth] = useState(0);
  const cell = Math.floor(weekWidth / 7);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { isPro, openPaywall } = usePro();
  // 0 = semaine en cours ; remonter dans le temps fait partie de Bûcheur Pro.
  const [weekOffset, setWeekOffset] = useState(0);
  const shown = addDays(now, -7 * weekOffset).getTime();
  const weekLabel =
    weekOffset === 0
      ? 'Ta semaine en rondelles'
      : `Semaine du ${startOfWeek(shown).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`;

  const bars = weekBars(sessions, shown, now);
  const weekTotal = bars.reduce((sum, b) => sum + b.minutes, 0);
  const bySubject = [...weekMinutesBySubject(sessions, shown).entries()].sort(
    (a, b) => b[1] - a[1],
  );
  const total = sessions.reduce((sum, s) => sum + s.durationMin, 0);
  const recent = [...sessions].sort((a, b) => b.startedAt - a.startedAt).slice(0, 10);
  const subject = (id: string) => subjects.find((s) => s.id === id);
  const daySessions = (key: string) =>
    sessions
      .filter((s) => dayKey(s.startedAt) === key)
      .sort((a, b) => a.startedAt - b.startedAt)
      .map((s) => ({
        key: s.id,
        minutes: s.durationMin,
        color: subject(s.subjectId)?.color ?? theme.textSecondary,
      }));
  const streak = currentStreak(sessions, now);
  const best = bestStreak(sessions);

  return (
    <Screen title="Statistiques" action={<SettingsButton />}>
      <Glass style={styles.summary}>
        <Stat
          value={formatDuration(weekTotal)}
          label={weekOffset === 0 ? 'Cette semaine' : 'Cette semaine-là'}
        />
        <View style={[styles.vSeparator, { backgroundColor: theme.border }]} />
        <Stat value={`${streak} j`} label="Série" />
        <View style={[styles.vSeparator, { backgroundColor: theme.border }]} />
        <Stat value={`${best} j`} label="Record" />
      </Glass>

      <View style={styles.weekNav}>
        <SectionTitle>{weekLabel}</SectionTitle>
        <View style={styles.weekArrows}>
          <WeekArrow
            label="‹"
            accessibilityLabel="Semaine précédente"
            onPress={() => (isPro ? setWeekOffset((o) => o + 1) : openPaywall())}
          />
          <WeekArrow
            label="›"
            accessibilityLabel="Semaine suivante"
            disabled={weekOffset === 0}
            onPress={() => setWeekOffset((o) => Math.max(0, o - 1))}
          />
        </View>
      </View>
      <Glass style={styles.chartBox}>
        <View style={styles.week} onLayout={(e) => setWeekWidth(e.nativeEvent.layout.width)}>
          {cell > 0 &&
            bars.map((b) => (
              <View
                key={b.key}
                style={[styles.day, { width: cell }]}
                accessibilityLabel={`${b.letter} : ${formatDuration(b.minutes)}`}>
                <TreeRings
                  size={cell - 2}
                  sessions={daySessions(b.key)}
                  goalMinutes={settings.dailyGoalMin}
                  strokeWidth={1.5}
                />
                <ThemedText
                  type={b.isToday ? 'smallBold' : 'small'}
                  themeColor={b.isToday ? 'text' : 'textSecondary'}>
                  {b.letter}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.dayMinutes}>
                  {b.minutes > 0 ? `${b.minutes}′` : '·'}
                </ThemedText>
              </View>
            ))}
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          Un cerne par séance. Pointillés : ton objectif de {formatDuration(settings.dailyGoalMin)}.
        </ThemedText>
      </Glass>

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
                  detail={[
                    new Date(s.startedAt).toLocaleString('fr-FR', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    }),
                    s.focus && FOCUS_LABELS[s.focus],
                    s.note,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
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

function WeekArrow({
  label,
  accessibilityLabel,
  onPress,
  disabled,
}: {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={({ pressed }) => [styles.arrow, { opacity: disabled ? 0.25 : pressed ? 0.5 : 1 }]}>
      <ThemedText themeColor="textSecondary" style={styles.arrowLabel}>
        {label}
      </ThemedText>
    </Pressable>
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
    borderRadius: 26,
    overflow: 'hidden',
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
    fontFamily: Display.title,
    fontWeight: 'normal',
    fontSize: 24,
    lineHeight: 32,
  },
  hint: {
    marginLeft: Spacing.three,
  },
  chartBox: {
    borderRadius: 26,
    overflow: 'hidden',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  weekArrows: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: -Spacing.two,
  },
  arrow: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowLabel: {
    fontSize: 24,
    lineHeight: 28,
  },
  week: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  day: {
    alignItems: 'center',
    gap: 2,
  },
  dayMinutes: {
    fontSize: 11,
    lineHeight: 14,
  },
});
