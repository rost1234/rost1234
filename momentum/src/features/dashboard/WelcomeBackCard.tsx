import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/AppText';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
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

/** The day the welcome-back card is showing, so the fresh-start card doesn't invite the same habit too. */
export const useWelcomeBackDay = create<{ day: LocalDateString | null }>(() => ({ day: null }));

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
        const [usage, logs] = await Promise.all([
          repositories.usage.getInRange(addDays(today, -400), today).catch(() => []),
          // Habits done from the widget or a notification count as being here too.
          repositories.habitLogs.getInRange(addDays(today, -400), addDays(today, -1)).catch(() => []),
        ]);
        const active = [...usage.filter((u) => u.seconds > 0).map((u) => u.logDate), ...logs.map((l) => l.logDate)];
        const away = daysAway(active, today);
        if (current && away !== null && away >= WELCOME_BACK_DAYS) {
          setShow(true);
          useWelcomeBackDay.setState({ day: today });
        }
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
      <Text style={styles.emoji} accessible={false} importantForAccessibility="no">
        🌱
      </Text>
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
