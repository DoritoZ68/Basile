import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, ProgressBar, Screen, SectionTitle, Stepper } from '@/components/ui';
import { Spacing, SubjectColors } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration, weekMinutesBySubject } from '@/lib/stats';
import { useStore } from '@/lib/store';

const GOAL_STEP = 30;

export default function SubjectsScreen() {
  const theme = useTheme();
  const { data, addSubject, updateSubject, removeSubject } = useStore();
  const week = weekMinutesBySubject(data.sessions, useNow(60_000));

  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
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
      {data.subjects.length === 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          Aucune matière. Ajoute-en une ci-dessous.
        </ThemedText>
      )}
      {data.subjects.map((s) => {
        const done = week.get(s.id) ?? 0;
        const open = openId === s.id;
        return (
          <Card key={s.id}>
            <Pressable
              accessibilityRole="button"
              accessibilityHint="Afficher les réglages de la matière"
              onPress={() => {
                setOpenId(open ? null : s.id);
                setConfirmDeleteId(null);
              }}
              style={styles.subjectHeader}>
              <View style={[styles.dot, { backgroundColor: s.color }]} />
              <ThemedText type="smallBold" style={styles.flex}>
                {s.name}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatDuration(done)} / {formatDuration(s.weeklyGoalMin)}
              </ThemedText>
            </Pressable>
            <ProgressBar value={done / s.weeklyGoalMin} color={s.color} />

            {open && (
              <View style={styles.editor}>
                <Stepper
                  label="Objectif par semaine"
                  value={formatDuration(s.weeklyGoalMin)}
                  onMinus={() =>
                    updateSubject(s.id, { weeklyGoalMin: Math.max(GOAL_STEP, s.weeklyGoalMin - GOAL_STEP) })
                  }
                  onPlus={() => updateSubject(s.id, { weeklyGoalMin: s.weeklyGoalMin + GOAL_STEP })}
                />
                <ColorPicker value={s.color} onChange={(c) => updateSubject(s.id, { color: c })} />
                <Button
                  label={confirmDeleteId === s.id ? 'Confirmer la suppression' : 'Supprimer la matière'}
                  variant="danger"
                  onPress={() => {
                    if (confirmDeleteId !== s.id) return setConfirmDeleteId(s.id);
                    removeSubject(s.id);
                    setOpenId(null);
                  }}
                />
              </View>
            )}
          </Card>
        );
      })}

      <SectionTitle>Nouvelle matière</SectionTitle>
      <Card>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ex. : Physique-chimie"
          placeholderTextColor={theme.textSecondary}
          returnKeyType="done"
          onSubmitEditing={submit}
          maxLength={30}
          style={[
            styles.input,
            { color: theme.text, backgroundColor: theme.backgroundSelected },
          ]}
        />
        <ColorPicker value={color} onChange={setColor} />
        <Stepper
          label="Objectif par semaine"
          value={formatDuration(goal)}
          onMinus={() => setGoal((g) => Math.max(GOAL_STEP, g - GOAL_STEP))}
          onPlus={() => setGoal((g) => g + GOAL_STEP)}
        />
        <Button label="Ajouter" onPress={submit} disabled={!name.trim()} />
      </Card>
    </Screen>
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
          style={[
            styles.swatch,
            { backgroundColor: c, borderColor: c === value ? theme.text : 'transparent' },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  editor: {
    gap: Spacing.three,
  },
  input: {
    fontSize: 17,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
  },
  colors: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
  },
});
