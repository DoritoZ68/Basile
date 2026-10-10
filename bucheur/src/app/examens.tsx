import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Group, Row, Screen, SectionTitle } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { addDays, dayKey, daysUntil, formatDate, parseDayKey } from '@/lib/stats';
import { useStore } from '@/lib/store';

const SHIFTS = [
  { label: '−7', days: -7 },
  { label: '−1', days: -1 },
  { label: '+1', days: 1 },
  { label: '+7', days: 7 },
  { label: '+30', days: 30 },
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
  const past = exams.filter((e) => e.days < 0).reverse();
  const inDays = daysUntil(date, now);

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

  const renderExam = (e: (typeof exams)[number]) => {
    const confirming = confirmDeleteId === e.id;
    return (
      <Row
        key={e.id}
        label={e.name}
        detail={formatDate(e.date)}
        value={confirming ? 'Retirer ?' : e.days < 0 ? 'Passé' : e.days === 0 ? 'Aujourd’hui' : `J-${e.days}`}
        valueColor={confirming ? theme.danger : e.days >= 0 ? theme.accent : undefined}
        onPress={() => {
          if (!confirming) return setConfirmDeleteId(e.id);
          removeExam(e.id);
          setConfirmDeleteId(null);
        }}
      />
    );
  };

  return (
    <Screen title="Examens">
      <SectionTitle>À venir</SectionTitle>
      {upcoming.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          Ajoute tes examens pour suivre le compte à rebours.
        </ThemedText>
      ) : (
        <Group>{upcoming.map(renderExam)}</Group>
      )}

      <SectionTitle>Nouvel examen</SectionTitle>
      <Group>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Nom, ex. Bac de français"
          placeholderTextColor={theme.textSecondary}
          returnKeyType="done"
          onSubmitEditing={submit}
          maxLength={40}
          style={[styles.input, { color: theme.text }]}
        />
        <View style={styles.dateRow}>
          <View style={styles.flex}>
            <ThemedText>{formatDate(date)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {inDays === 0 ? 'aujourd’hui' : `dans ${inDays} jour${inDays > 1 ? 's' : ''}`}
            </ThemedText>
          </View>
        </View>
        <View style={styles.shifts}>
          {SHIFTS.map((s) => (
            <Pressable
              key={s.label}
              accessibilityRole="button"
              accessibilityLabel={`${s.days > 0 ? 'Avancer' : 'Reculer'} de ${Math.abs(s.days)} jours`}
              onPress={() => shift(s.days)}
              style={({ pressed }) => [
                styles.shift,
                { backgroundColor: theme.backgroundSelected, opacity: pressed ? 0.6 : 1 },
              ]}>
              <ThemedText type="small">{s.label} j</ThemedText>
            </Pressable>
          ))}
        </View>
      </Group>
      <Button label="Ajouter l'examen" onPress={submit} disabled={!name.trim()} />

      {past.length > 0 && (
        <>
          <SectionTitle>Passés</SectionTitle>
          <Group>{past.map(renderExam)}</Group>
        </>
      )}
      {exams.length > 0 && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          Touche un examen deux fois pour le retirer.
        </ThemedText>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  hint: {
    marginLeft: Spacing.three,
  },
  input: {
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: Spacing.three,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
  },
  shifts: {
    flexDirection: 'row',
    gap: 6,
    padding: 12,
  },
  shift: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
});
