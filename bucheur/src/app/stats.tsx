import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Glass } from '@/components/glass';
import { ThemedText } from '@/components/themed-text';
import { TreeRings } from '@/components/tree-rings';
import { ScreenSettingsButton } from '@/components/settings-sheet';
import { Grid, Group, Panel, ProgressBar, Row, Screen, SectionTitle } from '@/components/ui';
import { Display, Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import {
  bestStreak,
  currentStreak,
  addDays,
  dayKey,
  formatDuration,
  minutesByDay,
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
  const rated = sessions.filter((x) => x.focus);
  const focusAverage =
    rated.length === 0
      ? null
      : (['difficile', 'correcte', 'excellente'] as const)[
          Math.round(rated.reduce((n, x) => n + (x.focus ?? 0), 0) / rated.length) - 1
        ];

  return (
    <Screen title="Statistiques" action={<ScreenSettingsButton />}>
      <Grid min={360}>
        <View style={styles.column}>
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
              Un cerne par séance. Pointillés : ton objectif de{' '}
              {formatDuration(settings.dailyGoalMin)}.
            </ThemedText>
          </Glass>
        </View>
        <View style={styles.column}>
          <Panel
            eyebrow="Par matière"
            title={weekOffset === 0 ? 'Cette semaine' : 'Cette semaine-là'}>
            {bySubject.length === 0 ? (
              <ThemedText themeColor="textSecondary">Aucune séance sur cette semaine.</ThemedText>
            ) : (
              bySubject.map(([id, minutes]) => {
                const sub = subject(id);
                const goal = sub?.weeklyGoalMin ?? 0;
                return (
                  <View key={id} style={styles.subjectStat}>
                    <View style={styles.subjectLine}>
                      <View
                        style={[styles.dot, { backgroundColor: sub?.color ?? theme.textSecondary }]}
                      />
                      <ThemedText style={styles.flex}>
                        {sub?.name ?? 'Matière supprimée'}
                      </ThemedText>
                      <ThemedText themeColor="textSecondary">
                        {formatDuration(minutes)}
                        {goal > 0 ? ` / ${formatDuration(goal)}` : ''}
                      </ThemedText>
                    </View>
                    {goal > 0 && <ProgressBar value={minutes / goal} color={sub?.color} />}
                  </View>
                );
              })
            )}
          </Panel>
          <Panel eyebrow="12 dernières semaines" title="Ta régularité">
            <Heatmap now={now} />
          </Panel>
          <Panel eyebrow="Depuis le début" title={formatDuration(total)}>
            <View style={styles.totals}>
              <Total value={String(sessions.length)} label="séances" />
              <Total
                value={String(data.tasks.filter((t) => t.done).length)}
                label="tâches faites"
              />
              <Total
                value={String(data.cards.reduce((n, c) => n + (c.reviews ?? 0), 0))}
                label="fiches révisées"
              />
            </View>
            {focusAverage !== null && (
              <ThemedText type="small" themeColor="textSecondary">
                Concentration moyenne ressentie : {focusAverage}.
              </ThemedText>
            )}
          </Panel>
        </View>
      </Grid>

      <SectionTitle>Dernières séances · {formatDuration(total)} au total</SectionTitle>
      {recent.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          Pas encore de séance. Ta première t&apos;attend sur la page d&apos;accueil.
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

/** Calendrier des 12 dernières semaines : une case par jour, plus foncée quand on a révisé plus. */
function Heatmap({ now }: { now: number }) {
  const theme = useTheme();
  const { data, settings } = useStore();
  const days = minutesByDay(data.sessions);
  const first = addDays(startOfWeek(now), -7 * 11);
  const todayKey = dayKey(now);
  const weeks = Array.from({ length: 12 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const key = dayKey(addDays(first, w * 7 + d));
      return { key, minutes: days.get(key) ?? 0, future: key > todayKey };
    }),
  );
  const active = weeks.flat().filter((d) => d.minutes > 0).length;
  return (
    <View style={styles.heatWrap}>
      <View style={styles.heatmap}>
        {weeks.map((week, w) => (
          <View key={w} style={styles.heatColumn}>
            {week.map((d) => {
              const level = Math.min(1, d.minutes / settings.dailyGoalMin);
              return (
                <View
                  key={d.key}
                  accessibilityLabel={`${d.key} : ${formatDuration(d.minutes)}`}
                  style={[
                    styles.heatCell,
                    {
                      backgroundColor: d.minutes > 0 ? theme.accent : theme.backgroundSelected,
                      opacity: d.future ? 0.25 : d.minutes > 0 ? 0.3 + level * 0.7 : 1,
                    },
                  ]}
                />
              );
            })}
          </View>
        ))}
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {active} jour{active > 1 ? 's' : ''} de révision sur les 12 dernières semaines. Plus la case
        est foncée, plus tu t’es approché de ton objectif du jour.
      </ThemedText>
    </View>
  );
}

function Total({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.total}>
      <ThemedText style={styles.totalValue}>{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
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
  column: {
    gap: Spacing.three,
  },
  flex: {
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  subjectStat: {
    gap: 6,
  },
  subjectLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heatWrap: {
    gap: Spacing.three,
  },
  heatmap: {
    flexDirection: 'row',
    gap: 4,
    width: '100%',
    maxWidth: 360,
  },
  heatColumn: {
    flex: 1,
    gap: 4,
  },
  heatCell: {
    aspectRatio: 1,
    borderRadius: 4,
  },
  totals: {
    flexDirection: 'row',
  },
  total: {
    flex: 1,
    gap: 2,
  },
  totalValue: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 600,
  },
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
