import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { daysUntil } from '@/lib/stats';
import { useStore } from '@/lib/store';
import type { Task } from '@/lib/types';

/** Échéance en clair : « En retard de 2 j », « Aujourd’hui », « Demain », « Dans 5 j ». */
export function dueLabel(due: string, now: number): { text: string; late: boolean } {
  const days = daysUntil(due, now);
  if (days < 0) return { text: `En retard de ${-days} j`, late: true };
  if (days === 0) return { text: 'Aujourd’hui', late: false };
  if (days === 1) return { text: 'Demain', late: false };
  return { text: `Dans ${days} j`, late: false };
}

/** Une tâche : toucher la case la coche, la croix la supprime. */
export function TaskRow({
  task,
  now,
  onRemove,
}: {
  task: Task;
  now: number;
  onRemove?: () => void;
}) {
  const theme = useTheme();
  const { data, toggleTask } = useStore();
  const subject = data.subjects.find((s) => s.id === task.subjectId);
  const due = task.due && !task.done ? dueLabel(task.due, now) : null;
  const detail = [subject?.name, due?.text].filter(Boolean).join(' · ');

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.done }}
        accessibilityLabel={task.title}
        onPress={() => toggleTask(task.id)}
        hitSlop={6}
        style={({ pressed }) => [styles.main, pressed && { opacity: 0.6 }]}>
        <View
          style={[
            styles.check,
            { borderColor: task.done ? theme.accent : theme.textSecondary },
            task.done && { backgroundColor: theme.accent },
          ]}>
          {task.done && (
            <Svg width={14} height={14} viewBox="0 0 24 24">
              <Path
                d="M5 12.5l4.5 4.5L19 7.5"
                stroke={theme.accentText}
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          )}
        </View>
        <View style={styles.text}>
          <ThemedText
            themeColor={task.done ? 'textSecondary' : 'text'}
            style={[styles.title, task.done && styles.done]}>
            {task.title}
          </ThemedText>
          {detail !== '' && (
            <View style={styles.detail}>
              {subject && <View style={[styles.dot, { backgroundColor: subject.color }]} />}
              <ThemedText
                type="small"
                style={{ color: due?.late ? theme.danger : theme.textSecondary }}>
                {detail}
              </ThemedText>
            </View>
          )}
        </View>
      </Pressable>
      {onRemove && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Supprimer « ${task.title} »`}
          onPress={onRemove}
          hitSlop={8}
          style={({ pressed }) => [styles.remove, pressed && { opacity: 0.5 }]}>
          <Svg width={14} height={14} viewBox="0 0 24 24">
            <Path
              d="M6 6l12 12M18 6L6 18"
              stroke={theme.textSecondary}
              strokeWidth={2.4}
              strokeLinecap="round"
            />
          </Svg>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: Spacing.two,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingLeft: Spacing.three,
    paddingVertical: 10,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
  },
  done: {
    textDecorationLine: 'line-through',
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  remove: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
