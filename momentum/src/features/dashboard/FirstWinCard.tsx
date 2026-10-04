import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '@/components/ui';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { haptics } from '@/core/haptics';
import { runDetached } from '@/core/errors';
import { addDays, localDateFromIso, type LocalDateString } from '@/core/localDate';
import { habitsDueOn } from '@/domain/habitSchedule';
import { timeOfDayNow } from '@/domain/rhythm';
import { useCelebrationStore } from '@/state/habitEffects';
import { isPaused } from '@/domain/pauses';
import { useHabitStore } from '@/state/habitStore';
import { usePlanningStore } from '@/state/planningStore';
import { useT } from '@/i18n';
import { useCoachMarksDone } from './CoachMarks';

const KEY = 'momentum.firstWin.v1';

/**
 * Right after setup (once the first-use tips are closed): one habit that fits
 * this part of the day, and its 30-second small step. Doing it ends day one
 * with a real success and a small celebration. Shown once, ever.
 */
export function FirstWinCard({ today, hour }: { today: LocalDateString; hour: number }) {
  const t = useT();
  const { typography } = useTheme();
  const styles = useStyles();
  const coachDone = useCoachMarksDone((s) => s.done);
  const [seen, setSeen] = useState<boolean | null>(null);
  const tapHabit = useHabitStore((s) => s.tapHabit);
  const pauses = usePlanningStore((s) => s.pauses);
  const candidate = useHabitStore((s) => {
    if (s.today !== today || s.status !== 'ready' || s.habits.length === 0) return null;
    // Only for a brand-new start: nothing done yet, ever, and every habit just created.
    if (Object.values(s.completedBefore).some((n) => n > 0)) return null;
    if (s.habits.some((h) => localDateFromIso(h.createdAt) < addDays(today, -1))) return null;
    if (s.habits.some((h) => s.logs[h.id]?.[today]?.status === 'completed')) return null;
    const now = timeOfDayNow(hour);
    const due = habitsDueOn(s.habits, today).filter(
      (h) => (h.timeOfDay === 'any' || h.timeOfDay === now) && !isPaused(pauses, today, h.id) && s.logs[h.id]?.[today]?.status !== 'skipped',
    );
    return due.find((h) => !h.isQuantitative && h.microStep) ?? due.find((h) => !h.isQuantitative) ?? null;
  });

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((value) => setSeen(Boolean(value)))
      .catch(() => setSeen(true));
  }, []);

  if (seen !== false || coachDone !== true || !candidate) return null;

  const close = () => {
    setSeen(true);
    runDetached(AsyncStorage.setItem(KEY, today));
  };
  const did = () => {
    haptics.success();
    tapHabit(candidate.id);
    useCelebrationStore.setState({
      celebration: { kind: 'firstWin', habitTitle: candidate.title, days: 1, choices: 1, at: Date.now() },
    });
    close();
  };

  return (
    <View style={styles.card} accessibilityRole="summary">
      <Text style={typography.label}>{t('firstWin.title', { title: candidate.title })}</Text>
      <Text style={typography.body}>{candidate.microStep ? t('firstWin.bodyStep', { step: candidate.microStep }) : t('firstWin.body')}</Text>
      <View style={styles.buttons}>
        <Button label={t('firstWin.did')} onPress={did} style={{ flex: 1 }} />
        <Button label={t('firstWin.later')} variant="ghost" onPress={close} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },
  buttons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
}));
