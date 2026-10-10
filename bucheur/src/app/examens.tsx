import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Chip, Screen, SectionTitle } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { addDays, dayKey, daysUntil, formatDate, parseDayKey } from '@/lib/stats';
import { useStore } from '@/lib/store';

const SHIFTS = [
  { label: '−1 sem.', days: -7 },
  { label: '−1 j', days: -1 },
  { label: '+1 j', days: 1 },
  { label: '+1 sem.', days: 7 },
  { label: '+1 mois', days: 30 },
];

export default function ExamsScreen() {
  const theme = useTheme();
  const { data, addExam, removeExam } = useStore();
  const now = useNow(60_000);
  const todayKey = dayKey(now);

  const [name, setName] = useState('');
  const [date, setDate] = useState(() => dayKey(addDays(Date.now(), 14)));
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const exams = data.exams
    .map((e) => ({ ...e, days: daysUntil(e.date, now) }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = exams.filter((e) => e.days >= 0);
  const past = exams.filter((e) => e.days < 0);

  const shift = (days: number) => {
    const next = dayKey(addDays(parseDayKey(date), days));
    setDate(next < todayKey ? todayKey : next);
  };

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    addExam({ name: trimmed, date });
    setName('');
  };

  const renderExam = (e: (typeof exams)[number]) => (
    <Card key={e.id} style={[styles.examRow, e.days < 0 && styles.past]}>
      <ThemedText style={[styles.countdown, { color: e.days < 0 ? theme.textSecondary : theme.accent }]}>
        {e.days < 0 ? '✓' : e.days === 0 ? 'J' : `J-${e.days}`}
      </ThemedText>
      <View style={styles.flex}>
        <ThemedText type="smallBold">{e.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatDate(e.date)}
        </ThemedText>
      </View>
      <Button
        label={confirmDeleteId === e.id ? 'Confirmer' : 'Retirer'}
        variant="danger"
        style={styles.removeButton}
        onPress={() => {
          if (confirmDeleteId !== e.id) return setConfirmDeleteId(e.id);
          removeExam(e.id);
          setConfirmDeleteId(null);
        }}
      />
    </Card>
  );

  return (
    <Screen title="Examens">
      {upcoming.length === 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          Ajoute tes examens pour suivre le compte à rebours depuis l&apos;écran Focus.
        </ThemedText>
      )}
      {upcoming.map(renderExam)}

      <SectionTitle>Nouvel examen</SectionTitle>
      <Card>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ex. : Bac de français"
          placeholderTextColor={theme.textSecondary}
          returnKeyType="done"
          onSubmitEditing={submit}
          maxLength={40}
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundSelected }]}
        />
        <View style={styles.dateRow}>
          <ThemedText type="smallBold">{formatDate(date)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            dans {daysUntil(date, now)} jour{daysUntil(date, now) > 1 ? 's' : ''}
          </ThemedText>
        </View>
        <View style={styles.chips}>
          {SHIFTS.map((s) => (
            <Chip key={s.label} label={s.label} onPress={() => shift(s.days)} />
          ))}
        </View>
        <Button label="Ajouter l'examen" onPress={submit} disabled={!name.trim()} />
      </Card>

      {past.length > 0 && (
        <>
          <SectionTitle>Passés</SectionTitle>
          {past.reverse().map(renderExam)}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  examRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  past: {
    opacity: 0.6,
  },
  countdown: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: 800,
    minWidth: 64,
  },
  removeButton: {
    minHeight: 36,
    paddingHorizontal: Spacing.two,
  },
  input: {
    fontSize: 17,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
  },
  dateRow: {
    gap: 2,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
