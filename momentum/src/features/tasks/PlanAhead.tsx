import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from '@/components/AppText';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { runDetached } from '@/core/errors';
import { haptics } from '@/core/haptics';
import { addDays, dayOfMonth, getWeekday, weekdayName, type LocalDateString } from '@/core/localDate';
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
  // A note about the day it was for (switching days in the planner keeps the text, not the note).
  const [problem, setProblem] = useState<{ kind: 'full' | 'failed'; date: LocalDateString } | null>(null);
  const day = dayLabel(date, today, t);

  const add = () => {
    const title = draft.trim();
    if (!title) return;
    setDraft('');
    runDetached(
      planTask(title, date).then((result) => {
        if (!result || result === 'full') {
          setProblem({ kind: result ?? 'failed', date });
          setDraft(title);
          return;
        }
        haptics.success();
        setProblem(null);
        onAdded(result);
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
      {problem?.date === date ? (
        <Text style={[typography.caption, problem.kind === 'failed' && { color: colors.danger }]} accessibilityLiveRegion="polite">
          {problem.kind === 'full' ? t('tasks.dayFull', { day }) : t('plan.failed')}
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(({ colors, typography, flat }) => ({
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
