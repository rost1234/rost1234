import { useState } from 'react';
import { ActionSheetIOS, Alert, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import type { Task } from '@/domain/models';
import { MAX_OPEN_TASKS_PER_DAY } from '@/domain/taskPlanning';
import { useTaskStore } from '@/state/taskStore';
import { t, useT } from '@/i18n';

function openTaskMenu(task: Task) {
  const { decide } = useTaskStore.getState();
  const actions = [
    { label: t('tasks.moveLater'), run: () => decide(task.id, 'later') },
    { label: t('tasks.drop'), run: () => decide(task.id, 'drop'), destructive: true },
  ];
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      { title: task.title, options: [...actions.map((a) => a.label), t('common.cancel')], destructiveButtonIndex: 1, cancelButtonIndex: 2 },
      (index) => actions[index]?.run(),
    );
    return;
  }
  Alert.alert(task.title, undefined, [
    ...actions.map((a) => ({ text: a.label, onPress: a.run, style: a.destructive ? ('destructive' as const) : ('default' as const) })),
    { text: t('common.cancel'), style: 'cancel' as const },
  ]);
}

export function TaskList() {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const tasks = useTaskStore((s) => s.tasks);
  const addTask = useTaskStore((s) => s.addTask);
  const toggleTask = useTaskStore((s) => s.toggleTask);
  const [draft, setDraft] = useState('');
  const [hint, setHint] = useState<string | null>(null);

  const openCount = tasks.filter((t) => !t.isCompleted).length;
  const isFull = openCount >= MAX_OPEN_TASKS_PER_DAY;

  const submit = () => {
    if (draft.trim().length === 0) return;
    const placed = addTask(draft);
    setHint(placed === 'later' ? t('tasks.fullSaved') : null);
    setDraft('');
  };

  return (
    <View style={styles.container}>
      {tasks.map((task) => (
        <Pressable
          key={task.id}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: task.isCompleted }}
          accessibilityHint={t('tasks.longPressHint')}
          onPress={() => toggleTask(task.id)}
          onLongPress={() => openTaskMenu(task)}
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
          placeholder={isFull ? t('tasks.placeholderFull') : t('tasks.placeholder')}
          placeholderTextColor={colors.textMuted}
          returnKeyType="done"
          maxLength={120}
          style={styles.input}
          accessibilityLabel={t('tasks.newTitleA11y')}
        />
        <Text style={styles.counter} accessibilityLabel={t('tasks.counterA11y', { open: openCount, max: MAX_OPEN_TASKS_PER_DAY })}>
          {openCount}/{MAX_OPEN_TASKS_PER_DAY}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t('tasks.add')} onPress={submit} style={styles.add}>
          <Text style={styles.addText}>＋</Text>
        </Pressable>
      </View>
      {hint ? <Text style={[typography.caption, styles.hint]}>{hint}</Text> : null}
    </View>
  );
}

const useStyles = makeStyles(({ colors, typography, shadow }) => ({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    ...shadow,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  box: {
    width: 22,
    height: 22,
    borderRadius: 11,
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
  counter: { ...typography.caption, fontVariant: ['tabular-nums'] },
  add: { padding: spacing.sm },
  addText: { fontSize: 22, color: colors.primary, fontWeight: '700' },
  hint: { paddingBottom: spacing.sm },
}));
