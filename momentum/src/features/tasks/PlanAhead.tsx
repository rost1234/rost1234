import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from '@/components/AppText';
import { Chip } from '@/components/ui';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { runDetached } from '@/core/errors';
import { haptics } from '@/core/haptics';
import { addDays, dayOfMonth, getWeekday, weekdayName, type LocalDateString } from '@/core/localDate';
import { repositories } from '@/data/repositories';
import type { Task } from '@/domain/models';
import { useT, type Translator } from '@/i18n';
import { useTaskStore } from '@/state/taskStore';

/** The next week, from tomorrow. */
export function nextDays(today: LocalDateString, count = 7): LocalDateString[] {
  return Array.from({ length: count }, (_, i) => addDays(today, i + 1));
}

/** "Tomorrow", then "Wed 15". */
export function dayLabel(date: LocalDateString, today: LocalDateString, t: Translator): string {
  if (date === addDays(today, 1)) return t('plan.tomorrow');
  return `${weekdayName(getWeekday(date), t.locale)} ${dayOfMonth(date)}`;
}

/**
 * A text field and ＋ that plan a task for one day (shows up on that day's list). Says so when
 * saving failed and keeps the text. `onAdded` gets the saved task.
 */
export function DayTaskInput({ date, today, onAdded }: { date: LocalDateString; today: LocalDateString; onAdded: (task: Task) => void }) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const planTask = useTaskStore((s) => s.planTask);
  const [draft, setDraft] = useState('');
  const [failed, setFailed] = useState(false);
  const day = dayLabel(date, today, t);

  const add = () => {
    const title = draft.trim();
    if (!title) return;
    setDraft('');
    runDetached(
      planTask(title, date).then((task) => {
        if (!task) {
          setFailed(true);
          setDraft(title);
          return;
        }
        haptics.success();
        setFailed(false);
        onAdded(task);
      }),
    );
  };

  return (
    <View style={styles.inputBlock}>
      <View style={styles.inputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={add}
          placeholder={t('plan.placeholder', { day })}
          placeholderTextColor={colors.textMuted}
          returnKeyType="done"
          blurOnSubmit={false}
          maxLength={120}
          style={styles.input}
          accessibilityLabel={t('plan.inputA11y', { day })}
        />
        <Pressable accessibilityRole="button" accessibilityLabel={t('tasks.add')} onPress={add} style={styles.add} hitSlop={6}>
          <Ionicons name="add" size={24} color={colors.onPrimary} />
        </Pressable>
      </View>
      {failed ? <Text style={[typography.caption, { color: colors.danger }]}>{t('plan.failed')}</Text> : null}
    </View>
  );
}

/**
 * Plan tasks for the coming days (from the evening reflection): pick a day, add a few things,
 * and they wait on that day's list. Planned tasks can be removed here too.
 */
export function PlanAhead({ today }: { today: LocalDateString }) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const days = nextDays(today);
  const [date, setDate] = useState<LocalDateString>(days[0] ?? addDays(today, 1));
  const [tasks, setTasks] = useState<Task[] | null>(null);
  // Only what was added here can be removed here (a quick fix of a typo, not a way to lose tasks).
  const [addedIds, setAddedIds] = useState<string[]>([]);

  useEffect(() => {
    let current = true;
    repositories.tasks.getForDate(date).then(
      (list) => {
        if (current) setTasks(list);
      },
      () => {
        if (current) setTasks([]);
      },
    );
    return () => {
      current = false;
    };
  }, [date]);

  const added = (task: Task) => {
    setAddedIds((ids) => [...ids, task.id]);
    setTasks((list) => [...(list ?? []), task]);
  };

  const remove = (task: Task) => {
    haptics.tap();
    setTasks((list) => (list ?? []).filter((x) => x.id !== task.id));
    // Through the store, so Today's "Coming up" drops it too.
    useTaskStore.getState().decide(task.id, 'drop');
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
        {days.map((d) => (
          <Chip key={d} label={dayLabel(d, today, t)} selected={d === date} onPress={() => setDate(d)} />
        ))}
      </ScrollView>
      <View style={styles.list}>
        {(tasks ?? []).map((task) => (
          <View key={task.id} style={styles.row}>
            <View style={styles.dot} />
            <Text style={[typography.body, { flex: 1 }]} numberOfLines={2}>
              {task.title}
            </Text>
            {addedIds.includes(task.id) ? (
              <Pressable accessibilityRole="button" accessibilityLabel={t('plan.removeA11y', { title: task.title })} onPress={() => remove(task)} hitSlop={10}>
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
        ))}
        {tasks !== null && tasks.length === 0 ? <Text style={typography.caption}>{t('plan.empty')}</Text> : null}
      </View>
      <DayTaskInput key={date} date={date} today={today} onAdded={added} />
    </View>
  );
}

const useStyles = makeStyles(({ colors, typography, flat }) => ({
  container: { gap: spacing.md },
  days: { gap: spacing.sm, paddingVertical: spacing.xs },
  list: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, ...flat },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 36 },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: colors.primary },
  inputBlock: { gap: spacing.xs },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: {
    flex: 1,
    ...typography.body,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  add: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
}));
