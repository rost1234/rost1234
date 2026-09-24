import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card } from '@/components/ui';
import { makeStyles, spacing, useTheme } from '@/components/theme';
import { runDetached } from '@/core/errors';
import { haptics } from '@/core/haptics';
import { addDays, type LocalDateString } from '@/core/localDate';
import { LEVEL_SNOOZE_DAYS, suggestLevelChange, type LevelSuggestion } from '@/domain/levels';
import type { Habit, Pause } from '@/domain/models';
import { applyPauses } from '@/domain/pauses';
import { statusesByHabit } from '@/services/streakService';
import { useHabitStore, type LogIndex } from '@/state/habitStore';
import { usePlanningStore } from '@/state/planningStore';
import { t, useT } from '@/i18n';

function copyFor(s: LevelSuggestion, habit: Habit): { title: string; body: string; icon: 'trending-up' | 'trending-down' | 'trophy' } {
  const unit = habit.unit ? ` ${habit.unit}` : '';
  switch (s.kind) {
    case 'up':
      return {
        icon: 'trending-up',
        title: t('level.upTitle', { title: habit.title }),
        body: t('level.upBody', { completed: s.completed, window: s.window, from: s.from, to: s.to, unit }),
      };
    case 'down':
      return {
        icon: 'trending-down',
        title: t('level.downTitle', { title: habit.title }),
        body: t('level.downBody', { missed: s.missed, window: s.window, to: s.to, unit }),
      };
    case 'goal_reached':
      return {
        icon: 'trophy',
        title: t('level.goalTitle', { title: habit.title }),
        body: t('level.goalBody', { target: s.target, unit }),
      };
  }
}

function firstSuggestion(
  habits: readonly Habit[],
  logs: LogIndex,
  pauses: readonly Pause[],
  today: LocalDateString,
): { s: LevelSuggestion; habit: Habit } | null {
  for (const habit of habits) {
    const statuses = statusesByHabit(Object.values(logs[habit.id] ?? {})).get(habit.id) ?? new Map();
    const s = suggestLevelChange(habit, applyPauses(statuses, pauses, today), today);
    if (s) return { s, habit };
  }
  return null;
}

/** One gentle Atomic-Habits suggestion at a time; the user always decides. */
export function LevelCard({ today }: { today: LocalDateString }) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const habits = useHabitStore((s) => s.habits);
  const logs = useHabitStore((s) => s.logs);
  const updateHabit = useHabitStore((s) => s.updateHabit);
  const pauses = usePlanningStore((s) => s.pauses);

  // The React Compiler memoizes this; it only reruns when habits/logs/pauses change.
  const suggestion = firstSuggestion(habits, logs, pauses, today);

  if (!suggestion) return null;
  const { s, habit } = suggestion;
  const copy = copyFor(s, habit);
  const snooze = addDays(today, LEVEL_SNOOZE_DAYS);
  const apply = (changes: Parameters<typeof updateHabit>[1]) => {
    haptics.success();
    runDetached(updateHabit(habit.id, { ...changes, levelSnoozeUntil: snooze }));
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Ionicons name={copy.icon} size={22} color={colors.primary} />
        <Text style={[typography.label, { flex: 1 }]}>{copy.title}</Text>
      </View>
      <Text style={typography.caption}>{copy.body}</Text>
      <View style={styles.actions}>
        {s.kind === 'goal_reached' ? (
          <>
            <Button label={t('level.keepHere')} onPress={() => apply({ growthMode: 'maintain' })} style={styles.action} />
            <Button label={t('level.keepGrowing')} variant="ghost" onPress={() => apply({})} style={styles.action} />
          </>
        ) : (
          <>
            <Button label={s.kind === 'up' ? t('level.goTo', { to: s.to }) : t('level.easeTo', { to: s.to })} onPress={() => apply({ targetCount: s.to })} style={styles.action} />
            <Button label={t('level.notNow')} variant="ghost" onPress={() => apply({})} style={styles.action} />
          </>
        )}
      </View>
    </Card>
  );
}

const useStyles = makeStyles(() => ({
  card: { gap: spacing.sm, marginBottom: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  action: { flex: 1, paddingHorizontal: spacing.md },
}));
