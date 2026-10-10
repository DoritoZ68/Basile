import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Group, ProgressBar, Row, Screen, SectionTitle, Stepper } from '@/components/ui';
import { Spacing, SubjectColors } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration, weekMinutesBySubject } from '@/lib/stats';
import { FREE_LIMITS, usePro } from '@/lib/pro';
import { useStore } from '@/lib/store';
import type { Subject } from '@/lib/types';

const GOAL_STEP = 30;

export default function SubjectsScreen() {
  const theme = useTheme();
  const { data, addSubject } = useStore();
  const { isPro, openPaywall } = usePro();
  const locked = !isPro && data.subjects.length >= FREE_LIMITS.subjects;
  const week = weekMinutesBySubject(data.sessions, useNow(60_000));

  const [openId, setOpenId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(SubjectColors[3]);
  const [goal, setGoal] = useState(120);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    addSubject({ name: trimmed, color, weeklyGoalMin: goal });
    setName('');
    setColor(SubjectColors[(data.subjects.length + 4) % SubjectColors.length]);
  };

  return (
    <Screen title="Matières">
      <SectionTitle>Cette semaine</SectionTitle>
      {data.subjects.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
          Aucune matière pour l&apos;instant.
        </ThemedText>
      ) : (
        <Group>
          {data.subjects.map((s) => (
            <SubjectRow
              key={s.id}
              subject={s}
              done={week.get(s.id) ?? 0}
              open={openId === s.id}
              onToggle={() => setOpenId(openId === s.id ? null : s.id)}
            />
          ))}
        </Group>
      )}

      <SectionTitle>Nouvelle matière</SectionTitle>
      {locked ? (
        <Group>
          <Row
            label={`Plus de ${FREE_LIMITS.subjects} matières`}
            detail="Matières illimitées avec Bûcheur Pro"
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
              placeholder="Nom, ex. Physique-chimie"
              placeholderTextColor={theme.textSecondary}
              returnKeyType="done"
              onSubmitEditing={submit}
              maxLength={30}
              style={[styles.input, { color: theme.text }]}
            />
            <ColorPicker value={color} onChange={setColor} />
            <Stepper
              label="Objectif par semaine"
              value={formatDuration(goal)}
              onMinus={() => setGoal((g) => Math.max(GOAL_STEP, g - GOAL_STEP))}
              onPlus={() => setGoal((g) => g + GOAL_STEP)}
            />
          </Group>
          <Button label="Ajouter" onPress={submit} disabled={!name.trim()} />
        </>
      )}
    </Screen>
  );
}

type SubjectRowProps = {
  subject: Subject;
  done: number;
  open: boolean;
  onToggle: () => void;
};

function SubjectRow({ subject: s, done, open, onToggle }: SubjectRowProps) {
  const { updateSubject, removeSubject } = useStore();
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Afficher les réglages de la matière"
        onPress={() => {
          onToggle();
          setConfirmDelete(false);
        }}
        style={({ pressed }) => [styles.subjectRow, pressed && styles.pressed]}>
        <View style={styles.subjectHeader}>
          <View style={[styles.dot, { backgroundColor: s.color }]} />
          <ThemedText style={styles.flex}>{s.name}</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.value}>
            {formatDuration(done)} / {formatDuration(s.weeklyGoalMin)}
          </ThemedText>
        </View>
        <ProgressBar value={done / s.weeklyGoalMin} color={s.color} />
      </Pressable>

      {open && (
        <View style={styles.editor}>
          <Stepper
            label="Objectif par semaine"
            value={formatDuration(s.weeklyGoalMin)}
            onMinus={() =>
              updateSubject(s.id, {
                weeklyGoalMin: Math.max(GOAL_STEP, s.weeklyGoalMin - GOAL_STEP),
              })
            }
            onPlus={() => updateSubject(s.id, { weeklyGoalMin: s.weeklyGoalMin + GOAL_STEP })}
          />
          <ColorPicker value={s.color} onChange={(c) => updateSubject(s.id, { color: c })} />
          <Button
            label={confirmDelete ? 'Confirmer la suppression' : 'Supprimer la matière'}
            variant="danger"
            onPress={() => (confirmDelete ? removeSubject(s.id) : setConfirmDelete(true))}
          />
        </View>
      )}
    </View>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.colors}>
      {SubjectColors.map((c) => (
        <Pressable
          key={c}
          accessibilityRole="button"
          accessibilityLabel={`Couleur ${c}`}
          accessibilityState={{ selected: c === value }}
          onPress={() => onChange(c)}
          hitSlop={4}
          style={[styles.swatchRing, { borderColor: c === value ? theme.text : 'transparent' }]}>
          <View style={[styles.swatch, { backgroundColor: c }]} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  empty: {
    marginLeft: Spacing.three,
  },
  pressed: {
    opacity: 0.6,
  },
  subjectRow: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    gap: 10,
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  value: {
    fontVariant: ['tabular-nums'],
  },
  editor: {
    paddingBottom: Spacing.two,
  },
  input: {
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: Spacing.three,
  },
  colors: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  swatchRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
});
