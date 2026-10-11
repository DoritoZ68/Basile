import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ScreenSettingsButton } from '@/components/settings-sheet';
import { TaskRow } from '@/components/task-row';
import { ThemedText } from '@/components/themed-text';
import {
  Button,
  Chip,
  Grid,
  Group,
  Panel,
  ProgressBar,
  Screen,
  SectionTitle,
  TextLink,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { addDays, dayKey, daysUntil, startOfWeek } from '@/lib/stats';
import { useStore } from '@/lib/store';
import type { Task } from '@/lib/types';

type DueChoice = 'none' | 'today' | 'tomorrow' | 'week' | 'nextWeek';

const DUE_CHOICES: { value: DueChoice; label: string }[] = [
  { value: 'none', label: 'Sans échéance' },
  { value: 'today', label: 'Aujourd’hui' },
  { value: 'tomorrow', label: 'Demain' },
  { value: 'week', label: 'Cette semaine' },
  { value: 'nextWeek', label: 'Dans 7 jours' },
];

function dueFor(choice: DueChoice, now: number): string | undefined {
  if (choice === 'none') return undefined;
  if (choice === 'today') return dayKey(now);
  if (choice === 'tomorrow') return dayKey(addDays(now, 1));
  if (choice === 'week') return dayKey(addDays(startOfWeek(now), 6));
  return dayKey(addDays(now, 7));
}

/** Rangement des tâches à faire, par échéance. */
function groupTasks(tasks: Task[], now: number) {
  const groups: { title: string; tasks: Task[] }[] = [
    { title: 'En retard', tasks: [] },
    { title: 'Aujourd’hui', tasks: [] },
    { title: 'Cette semaine', tasks: [] },
    { title: 'Plus tard', tasks: [] },
    { title: 'Sans échéance', tasks: [] },
  ];
  const weekEnd = dayKey(addDays(startOfWeek(now), 6));
  for (const t of tasks) {
    if (!t.due) groups[4].tasks.push(t);
    else if (daysUntil(t.due, now) < 0) groups[0].tasks.push(t);
    else if (daysUntil(t.due, now) === 0) groups[1].tasks.push(t);
    else if (t.due <= weekEnd) groups[2].tasks.push(t);
    else groups[3].tasks.push(t);
  }
  for (const g of groups) {
    g.tasks.sort((a, b) => (a.due ?? '').localeCompare(b.due ?? '') || a.createdAt - b.createdAt);
  }
  return groups.filter((g) => g.tasks.length > 0);
}

export default function TasksScreen() {
  const theme = useTheme();
  const { data, addTask, removeTask, clearDoneTasks } = useStore();
  const now = useNow(60_000);
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState<string | undefined>(undefined);
  const [due, setDue] = useState<DueChoice>('today');
  const [filter, setFilter] = useState<string | null>(null);

  const visible = data.tasks.filter((t) => !filter || t.subjectId === filter);
  const todo = visible.filter((t) => !t.done);
  const done = visible.filter((t) => t.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));
  const groups = groupTasks(todo, now);

  const weekStart = startOfWeek(now).getTime();
  const doneThisWeek = data.tasks.filter((t) => t.done && (t.doneAt ?? 0) >= weekStart).length;
  const dueThisWeek = data.tasks.filter(
    (t) =>
      t.due && t.due <= dayKey(addDays(weekStart, 6)) && (!t.done || (t.doneAt ?? 0) >= weekStart),
  ).length;

  const submit = () => {
    const trimmed = title.trim();
    if (trimmed.length < 2) return;
    addTask({ title: trimmed, subjectId, due: dueFor(due, now) });
    setTitle('');
  };

  return (
    <Screen subtitle="Ta liste de révisions" title="Tâches" action={<ScreenSettingsButton />}>
      <ThemedText themeColor="textSecondary" style={styles.lead}>
        Découpe tes révisions en petites tâches concrètes : « Exercices 3 à 6 du chapitre 4 » plutôt
        que « Réviser les maths ». Trois tâches par jour, c’est déjà beaucoup.
      </ThemedText>

      <Grid min={340}>
        <View style={styles.column}>
          {data.subjects.length > 0 && data.tasks.length > 0 && (
            <View style={styles.chips}>
              <Chip label="Toutes" selected={filter === null} onPress={() => setFilter(null)} />
              {data.subjects.map((s) => (
                <Chip
                  key={s.id}
                  label={s.name}
                  color={s.color}
                  selected={filter === s.id}
                  onPress={() => setFilter(filter === s.id ? null : s.id)}
                />
              ))}
            </View>
          )}

          {todo.length === 0 ? (
            <Panel>
              <ThemedText style={styles.emptyTitle}>
                {data.tasks.length === 0
                  ? 'Rien de prévu pour l’instant.'
                  : 'Tout est fait. Bravo.'}
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                {data.tasks.length === 0
                  ? 'Ajoute ta première tâche avec le formulaire. Tu pourras la cocher ici.'
                  : 'Profites-en pour réviser tes fiches ou prendre de l’avance.'}
              </ThemedText>
              {data.tasks.length > 0 && (
                <TextLink label="Réviser mes fiches ›" onPress={() => router.navigate('/fiches')} />
              )}
            </Panel>
          ) : (
            groups.map((g) => (
              <View key={g.title} style={styles.group}>
                <SectionTitle>{`${g.title} · ${g.tasks.length}`}</SectionTitle>
                <Group>
                  {g.tasks.map((t) => (
                    <TaskRow key={t.id} task={t} now={now} onRemove={() => removeTask(t.id)} />
                  ))}
                </Group>
              </View>
            ))
          )}

          {done.length > 0 && (
            <View style={styles.group}>
              <View style={styles.doneHeader}>
                <SectionTitle>{`Faites · ${done.length}`}</SectionTitle>
                <TextLink label="Tout retirer" onPress={clearDoneTasks} />
              </View>
              <Group>
                {done.slice(0, 12).map((t) => (
                  <TaskRow key={t.id} task={t} now={now} onRemove={() => removeTask(t.id)} />
                ))}
              </Group>
            </View>
          )}
        </View>

        <View style={styles.column}>
          <Panel title="Nouvelle tâche">
            <TextInput
              value={title}
              onChangeText={setTitle}
              onSubmitEditing={submit}
              placeholder="Ex. Fiches sur la guerre froide"
              placeholderTextColor={theme.textSecondary}
              maxLength={80}
              returnKeyType="done"
              accessibilityLabel="Nom de la tâche"
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.backgroundSelected },
              ]}
            />
            <ThemedText type="small" themeColor="textSecondary">
              Échéance
            </ThemedText>
            <View style={styles.chips}>
              {DUE_CHOICES.map((c) => (
                <Chip
                  key={c.value}
                  label={c.label}
                  selected={due === c.value}
                  onPress={() => setDue(c.value)}
                />
              ))}
            </View>
            {data.subjects.length > 0 && (
              <>
                <ThemedText type="small" themeColor="textSecondary">
                  Matière (facultatif)
                </ThemedText>
                <View style={styles.chips}>
                  {data.subjects.map((s) => (
                    <Chip
                      key={s.id}
                      label={s.name}
                      color={s.color}
                      selected={subjectId === s.id}
                      onPress={() => setSubjectId(subjectId === s.id ? undefined : s.id)}
                    />
                  ))}
                </View>
              </>
            )}
            <Button label="Ajouter la tâche" onPress={submit} disabled={title.trim().length < 2} />
          </Panel>

          <Panel
            eyebrow="Cette semaine"
            title={`${doneThisWeek} tâche${doneThisWeek > 1 ? 's' : ''} faite${doneThisWeek > 1 ? 's' : ''}`}>
            {dueThisWeek > 0 && (
              <>
                <ProgressBar value={doneThisWeek / Math.max(dueThisWeek, doneThisWeek)} />
                <ThemedText type="small" themeColor="textSecondary">
                  {Math.max(0, dueThisWeek - doneThisWeek)} encore prévue
                  {dueThisWeek - doneThisWeek > 1 ? 's' : ''} d’ici dimanche.
                </ThemedText>
              </>
            )}
            <ThemedText type="small" themeColor="textSecondary">
              Astuce : commence la journée par la tâche la plus difficile, quand tu es le plus
              frais.
            </ThemedText>
            <TextLink
              label="La règle des 3 tâches ›"
              onPress={() =>
                router.navigate({ pathname: '/methodes/[id]', params: { id: 'trois-taches' } })
              }
            />
          </Panel>
        </View>
      </Grid>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: {
    maxWidth: 640,
  },
  column: {
    gap: Spacing.three,
  },
  group: {
    gap: Spacing.three,
  },
  doneHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingRight: Spacing.three,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  input: {
    fontSize: 16,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 600,
  },
});
