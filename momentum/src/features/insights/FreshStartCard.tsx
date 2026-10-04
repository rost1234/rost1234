import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { runDetached } from '@/core/errors';
import { addDays, type LocalDateString } from '@/core/localDate';
import { freshStartOccasion, habitToWelcomeBack, type FreshStartOccasion } from '@/domain/motivation';
import type { Habit } from '@/domain/models';
import { useHabitStore } from '@/state/habitStore';
import { useT, type TranslationKey } from '@/i18n';

const KEY = 'momentum.freshStart.v1';

const TITLE: Record<FreshStartOccasion, TranslationKey> = {
  month: 'fresh.month',
  roshHashana: 'fresh.roshHashana',
  year: 'fresh.year',
};

/**
 * On a temporal landmark (the 1st of the month, Rosh Hashanah, January 1st) with
 * a habit that's had a break, this takes the daily insight's place: an invitation
 * to start it again, or to let it go. No notification, no guilt.
 */
export function useFreshStart(today: LocalDateString): { occasion: FreshStartOccasion; habit: Habit; idle: boolean; close: () => void } | null {
  const occasion = freshStartOccasion(today);
  const [closedOn, setClosedOn] = useState<string | null | undefined>(undefined);
  const habit = useHabitStore((s) => (occasion ? habitToWelcomeBack(s.habits, s.streaks, s.completedBefore) : null));
  // Not done at all in the last 30 days → offering to archive it is fair.
  const idle = useHabitStore((s) => {
    if (!habit) return false;
    const byDate = s.logs[habit.id] ?? {};
    return !Object.entries(byDate).some(([date, log]) => date > addDays(today, -30) && log.status === 'completed');
  });

  useEffect(() => {
    if (!occasion) return;
    AsyncStorage.getItem(KEY)
      .then(setClosedOn)
      .catch(() => setClosedOn(today));
  }, [occasion, today]);

  if (!occasion || !habit || closedOn === undefined || closedOn === today) return null;
  const close = () => {
    setClosedOn(today);
    runDetached(AsyncStorage.setItem(KEY, today));
  };
  return { occasion, habit, idle, close };
}

export function FreshStartCard({ occasion, habit, idle, close }: NonNullable<ReturnType<typeof useFreshStart>>) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const archiveHabit = useHabitStore((s) => s.archiveHabit);
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="sunny-outline" size={20} color={colors.success} />
        <Text style={[typography.overline, { flex: 1, color: colors.success }]}>{t(TITLE[occasion])}</Text>
      </View>
      <Text style={typography.body}>{t('fresh.body', { title: habit.title })}</Text>
      <Text style={typography.caption}>{t('fresh.why')}</Text>
      <View style={styles.buttons}>
        <Button label={t('fresh.restart')} onPress={close} style={{ flex: 1 }} />
        {idle ? (
          <Button
            label={t('fresh.letGo')}
            variant="ghost"
            onPress={() => {
              runDetached(archiveHabit(habit.id));
              close();
            }}
            style={{ flex: 1 }}
          />
        ) : null}
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colors, shadow }) => ({
  card: { gap: spacing.sm, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, marginBottom: spacing.md, ...shadow },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  buttons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
}));
