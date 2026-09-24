import { ScrollView, StyleSheet, View } from 'react-native';
import { spacing } from '@/components/theme';
import type { Habit, Task } from '@/domain/models';
import type { FocusLink } from '@/state/focusStore';
import { FocusChip, FocusLabel } from './focusUi';

interface LinkSelectorProps {
  habits: readonly Habit[];
  tasks: readonly Task[];
  value: FocusLink;
  onChange: (link: FocusLink) => void;
}

const NONE: FocusLink = { habitId: null, taskId: null };

export function LinkSelector({ habits, tasks, value, onChange }: LinkSelectorProps) {
  const openTasks = tasks.filter((t) => !t.isCompleted && !t.id.startsWith('pending-'));
  const isNone = value.habitId === null && value.taskId === null;
  return (
    <View style={styles.container}>
      <FocusLabel>Working on</FocusLabel>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <FocusChip label="Just focus" selected={isNone} onPress={() => onChange(NONE)} />
        {habits.map((habit) => (
          <FocusChip
            key={habit.id}
            label={habit.title}
            selected={value.habitId === habit.id}
            onPress={() => onChange({ habitId: habit.id, taskId: null })}
          />
        ))}
        {openTasks.map((task) => (
          <FocusChip
            key={task.id}
            label={`☐ ${task.title}`}
            selected={value.taskId === task.id}
            onPress={() => onChange({ habitId: null, taskId: task.id })}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm, alignSelf: 'stretch' },
  row: { gap: spacing.sm, paddingVertical: spacing.xs },
});
