import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { SettingsButton } from '@/components/settings-sheet';
import { ThemedText } from '@/components/themed-text';
import { Button, Chip, Group, Row, Screen, SectionTitle } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { addDays, dayKey, daysUntil, formatDate, parseDayKey } from '@/lib/stats';
import { FREE_LIMITS, usePro } from '@/lib/pro';
import { useStore } from '@/lib/store';
import type { Exam } from '@/lib/types';

const SHIFTS = [
  { label: '−7', days: -7 },
  { label: '−1', days: -1 },
  { label: '+1', days: 1 },
  { label: '+7', days: 7 },
  { label: '+30', days: 30 },
];

/** Décale une date (YYYY-MM-DD) sans jamais passer avant aujourd'hui. */
function shiftDate(date: string, days: number, todayKey: string) {
  const next = dayKey(addDays(parseDayKey(date), days));
  return next < todayKey ? todayKey : next;
}

export default function ExamsScreen() {
  const theme = useTheme();
  const { data, addExam } = useStore();
  const now = useNow(60_000);
  const todayKey = dayKey(now);

  const [name, setName] = useState('');
  const [date, setDate] = useState(() => dayKey(addDays(Date.now(), 14)));
  const [subjectId, setSubjectId] = useState<string | undefined>(undefined);
  const [openId, setOpenId] = useState<string | null>(null);

  const exams = data.exams
    .map((e) => ({ ...e, days: daysUntil(e.date, now) }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = exams.filter((e) => e.days >= 0);
  const past = exams.filter((e) => e.days < 0).reverse();
  // Seuls les examens à venir comptent dans la limite gratuite.
  const { isPro, openPaywall } = usePro();
  const locked = !isPro && upcoming.length >= FREE_LIMITS.exams;

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    addExam({ name: trimmed, date, subjectId });
    setName('');
    setSubjectId(undefined);
  };

  const renderExam = (e: Exam & { days: number }) => (
    <ExamRow
      key={e.id}
      exam={e}
      days={e.days}
      todayKey={todayKey}
      open={openId === e.id}
      onToggle={() => setOpenId(openId === e.id ? null : e.id)}
    />
  );

  return (
    <Screen title="Examens" action={<SettingsButton />}>
      <SectionTitle>À venir</SectionTitle>
      {upcoming.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          Ajoute tes examens pour suivre le compte à rebours.
        </ThemedText>
      ) : (
        <Group>{upcoming.map(renderExam)}</Group>
      )}

      <SectionTitle>Nouvel examen</SectionTitle>
      {locked ? (
        <Group>
          <Row
            label={`Plus de ${FREE_LIMITS.exams} examens à venir`}
            detail="Examens illimités avec Bûcheur Pro"
            value="Pro ›"
            valueColor={theme.accent}
            onPress={openPaywall}
          />
        </Group>
      ) : (
        <>
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
            <DatePicker
              date={date}
              days={daysUntil(date, now)}
              onShift={(days) => setDate(shiftDate(date, days, todayKey))}
            />
            <SubjectPicker value={subjectId} onChange={setSubjectId} />
          </Group>
          <Button label="Ajouter l'examen" onPress={submit} disabled={!name.trim()} />
        </>
      )}

      {past.length > 0 && (
        <>
          <SectionTitle>Passés</SectionTitle>
          <Group>{past.map(renderExam)}</Group>
        </>
      )}
      {exams.length > 0 && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          Touche un examen pour le modifier ou le retirer.
        </ThemedText>
      )}
    </Screen>
  );
}

type ExamRowProps = {
  exam: Exam;
  days: number;
  todayKey: string;
  open: boolean;
  onToggle: () => void;
};

function ExamRow({ exam: e, days, todayKey, open, onToggle }: ExamRowProps) {
  const theme = useTheme();
  const { data, updateExam, removeExam } = useStore();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState(e.name);
  const subject = data.subjects.find((s) => s.id === e.subjectId);
  // Un nom vide n'est pas enregistré : on revient au nom actuel.
  const saveName = () => {
    const trimmed = name.trim();
    if (trimmed) updateExam(e.id, { name: trimmed });
    else setName(e.name);
  };

  return (
    <View>
      <Row
        label={e.name}
        color={subject?.color}
        detail={[formatDate(e.date), subject?.name].filter(Boolean).join(' · ')}
        value={days < 0 ? 'Passé' : days === 0 ? 'Aujourd’hui' : `J-${days}`}
        valueColor={days >= 0 ? theme.accent : undefined}
        onPress={() => {
          onToggle();
          setConfirmDelete(false);
        }}
      />
      {open && (
        <View style={styles.editor}>
          <TextInput
            value={name}
            onChangeText={setName}
            onEndEditing={saveName}
            onBlur={saveName}
            onSubmitEditing={saveName}
            returnKeyType="done"
            maxLength={40}
            accessibilityLabel="Nom de l’examen"
            style={[
              styles.renameInput,
              { color: theme.text, backgroundColor: theme.backgroundSelected },
            ]}
          />
          <DatePicker
            date={e.date}
            days={days}
            onShift={(d) => updateExam(e.id, { date: shiftDate(e.date, d, todayKey) })}
          />
          <SubjectPicker
            value={e.subjectId}
            onChange={(subjectId) => updateExam(e.id, { subjectId })}
          />
          <Button
            label={confirmDelete ? 'Confirmer : retirer l’examen' : 'Retirer l’examen'}
            variant="danger"
            onPress={() => (confirmDelete ? removeExam(e.id) : setConfirmDelete(true))}
          />
        </View>
      )}
    </View>
  );
}

function DatePicker({
  date,
  days,
  onShift,
}: {
  date: string;
  days: number;
  onShift: (days: number) => void;
}) {
  const theme = useTheme();
  return (
    <>
      <View style={styles.dateRow}>
        <ThemedText>{formatDate(date)}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {days < 0
            ? 'passé'
            : days === 0
              ? 'aujourd’hui'
              : `dans ${days} jour${days > 1 ? 's' : ''}`}
        </ThemedText>
      </View>
      <View style={styles.shifts}>
        {SHIFTS.map((s) => (
          <Pressable
            key={s.label}
            accessibilityRole="button"
            accessibilityLabel={`${s.days > 0 ? 'Avancer' : 'Reculer'} de ${Math.abs(s.days)} jours`}
            onPress={() => onShift(s.days)}
            style={({ pressed }) => [
              styles.shift,
              { backgroundColor: theme.backgroundSelected, opacity: pressed ? 0.6 : 1 },
            ]}>
            <ThemedText type="small">{s.label} j</ThemedText>
          </Pressable>
        ))}
      </View>
    </>
  );
}

/** Matière liée à l'examen (facultative) : toucher la matière choisie la retire. */
function SubjectPicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (subjectId: string | undefined) => void;
}) {
  const { data } = useStore();
  if (data.subjects.length === 0) return null;
  return (
    <View style={styles.subjects}>
      <ThemedText type="small" themeColor="textSecondary">
        Matière (facultatif)
      </ThemedText>
      <View style={styles.chips}>
        {data.subjects.map((s) => (
          <Chip
            key={s.id}
            label={s.name}
            color={s.color}
            selected={value === s.id}
            onPress={() => onChange(value === s.id ? undefined : s.id)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: {
    marginLeft: Spacing.three,
  },
  input: {
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: Spacing.three,
  },
  dateRow: {
    paddingHorizontal: Spacing.three,
    paddingTop: 12,
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
    borderRadius: 999,
  },
  subjects: {
    paddingHorizontal: Spacing.three,
    paddingBottom: 12,
    gap: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  editor: {
    paddingTop: 4,
    paddingBottom: Spacing.two,
  },
  renameInput: {
    marginHorizontal: Spacing.three,
    fontSize: 16,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
});
