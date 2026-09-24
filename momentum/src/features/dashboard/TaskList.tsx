import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/components/theme';
import { useTaskStore } from '@/state/taskStore';

export function TaskList() {
  const tasks = useTaskStore((s) => s.tasks);
  const addTask = useTaskStore((s) => s.addTask);
  const toggleTask = useTaskStore((s) => s.toggleTask);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const [draft, setDraft] = useState('');

  const submit = () => {
    if (draft.trim().length === 0) return;
    addTask(draft);
    setDraft('');
  };

  return (
    <View style={styles.container}>
      {tasks.map((task) => (
        <Pressable
          key={task.id}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: task.isCompleted }}
          accessibilityHint="Long press to delete"
          onPress={() => toggleTask(task.id)}
          onLongPress={() => deleteTask(task.id)}
          style={styles.row}
        >
          <View style={[styles.box, task.isCompleted && styles.boxDone]}>
            {task.isCompleted ? <Text style={styles.tick}>✓</Text> : null}
          </View>
          <Text style={[typography.body, { flex: 1 }, task.isCompleted && styles.done]} numberOfLines={2}>
            {task.title}
          </Text>
        </Pressable>
      ))}
      <View style={styles.inputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={submit}
          placeholder="Add a task for today…"
          placeholderTextColor={colors.textMuted}
          returnKeyType="done"
          maxLength={120}
          style={styles.input}
          accessibilityLabel="New task title"
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Add task" onPress={submit} style={styles.add}>
          <Text style={styles.addText}>＋</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxDone: { backgroundColor: colors.success, borderColor: colors.success },
  tick: { color: colors.onPrimary, fontSize: 13, fontWeight: '700' },
  done: { color: colors.textMuted, textDecorationLine: 'line-through' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: { flex: 1, ...typography.body, paddingVertical: spacing.md },
  add: { padding: spacing.sm },
  addText: { fontSize: 22, color: colors.primary, fontWeight: '700' },
});
