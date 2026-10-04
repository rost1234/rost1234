import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '@/components/ui';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { runDetached } from '@/core/errors';
import { addDays, type LocalDateString } from '@/core/localDate';
import { repositories } from '@/data/repositories';
import { daysAway, habitToWelcomeBack, WELCOME_BACK_DAYS } from '@/domain/motivation';
import { useHabitStore } from '@/state/habitStore';
import { usePlanningStore } from '@/state/planningStore';
import { useTaskStore } from '@/state/taskStore';
import { useT } from '@/i18n';

const KEY = 'momentum.welcomeBack.v1';

/**
 * After 5+ days away: a warm hello and one small way back, instead of broken
 * streaks and a pile of old tasks. No counting of missed days. Returns true
 * while it shows, so the "decide" card can step aside that day.
 */
export function useWelcomeBack(today: LocalDateString): { show: boolean; close: () => void } {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let current = true;
    runDetached(
      (async () => {
        if ((await AsyncStorage.getItem(KEY).catch(() => null)) === today) return;
        const usage = await repositories.usage.getInRange(addDays(today, -120), today).catch(() => []);
        const away = daysAway(
          usage.filter((u) => u.seconds > 0).map((u) => u.logDate),
          today,
        );
        if (current && away !== null && away >= WELCOME_BACK_DAYS) setShow(true);
      })(),
    );
    return () => {
      current = false;
    };
  }, [today]);
  const close = () => {
    setShow(false);
    runDetached(AsyncStorage.setItem(KEY, today));
  };
  return { show, close };
}

export function WelcomeBackCard({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { typography } = useTheme();
  const styles = useStyles();
  const habit = useHabitStore((s) => habitToWelcomeBack(s.habits, s.streaks, s.completedBefore));
  const isMinimum = usePlanningStore((s) => s.dayMode === 'minimum');
  const toggleMinimumDay = usePlanningStore((s) => s.toggleMinimumDay);
  const overdue = useTaskStore((s) => s.overdue);
  const decide = useTaskStore((s) => s.decide);

  const smallDay = () => {
    if (!isMinimum) runDetached(toggleMinimumDay());
    onClose();
  };
  const clearOld = () => {
    for (const task of overdue) decide(task.id, 'later');
    onClose();
  };

  return (
    <View style={styles.card} accessibilityRole="summary">
      <Text style={styles.emoji}>🌱</Text>
      <Text style={typography.heading}>{t('welcome.title')}</Text>
      <Text style={typography.body}>{habit ? t('welcome.bodyHabit', { title: habit.title }) : t('welcome.body')}</Text>
      <View style={styles.buttons}>
        <Button label={t('welcome.smallDay')} onPress={smallDay} />
        {overdue.length > 0 ? (
          <Button label={t.plural('welcome.oldTasks', overdue.length)} variant="secondary" onPress={clearOld} />
        ) : null}
        <Button label={t('welcome.later')} variant="ghost" onPress={onClose} />
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.successSoft,
  },
  emoji: { fontSize: 28 },
  buttons: { gap: spacing.sm, marginTop: spacing.xs },
}));
