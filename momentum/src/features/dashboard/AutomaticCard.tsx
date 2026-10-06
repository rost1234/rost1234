import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/AppText';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, Chip } from '@/components/ui';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { runDetached } from '@/core/errors';
import { addDays, type LocalDateString } from '@/core/localDate';
import { AUTOMATIC_DAY, habitAgeDays } from '@/domain/motivation';
import { useHabitStore } from '@/state/habitStore';
import { useT } from '@/i18n';
import { useHomePromptSlot } from './homePrompts';

const KEY = 'momentum.automatic.v1';
/** habitId → the 1–5 answer, or the day to ask again after "not now" (a week later). */
type Answers = Record<string, number | LocalDateString>;

const SCORES = [1, 2, 3, 4, 5] as const;
/** Stored beside the answers: the day a question was last asked. */
const LAST_ASKED = '__lastAsked';

/**
 * Around day 66 of a habit (the median time to automaticity, Lally et al. 2010):
 * one question, once per habit — "does it happen without thinking yet?" A high
 * answer offers to turn off its reminder and lean on the routine instead.
 */
export function AutomaticCard({ today }: { today: LocalDateString }) {
  const t = useT();
  const { typography } = useTheme();
  const styles = useStyles();
  const [answers, setAnswers] = useState<Answers | null>(null);
  const [answered, setAnswered] = useState<{ habitId: string; score: number } | null>(null);
  const habits = useHabitStore((s) => s.habits);
  const streaks = useHabitStore((s) => s.streaks);
  const updateHabit = useHabitStore((s) => s.updateHabit);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        const parsed: unknown = raw ? JSON.parse(raw) : {};
        setAnswers(parsed && typeof parsed === 'object' ? (parsed as Answers) : {});
      })
      .catch(() => setAnswers({}));
  }, []);

  // One habit at a time, and at most one question a day: past day 66, still going, not asked yet.
  const pending =
    answers && answers[LAST_ASKED] !== today
      ? habits.find((h) => {
          const answer = answers[h.id];
          const asked = typeof answer === 'number' || (typeof answer === 'string' && answer > today);
          return !h.isArchived && !h.isQuit && !asked && (streaks[h.id] ?? 0) > 0 && habitAgeDays(h, today) >= AUTOMATIC_DAY;
        })
      : undefined;
  const isMine = useHomePromptSlot('automatic', answered !== null || pending !== undefined);

  if (!answers || !isMine) return null;
  const save = (next: Answers) => {
    setAnswers(next);
    runDetached(AsyncStorage.setItem(KEY, JSON.stringify(next)));
  };

  if (answered) {
    const habit = habits.find((h) => h.id === answered.habitId);
    if (!habit) return null;
    const offerReminderOff = answered.score >= 4 && habit.reminder !== 'off';
    return (
      <View style={styles.card} accessibilityLiveRegion="polite">
        <Text style={typography.body}>{answered.score >= 4 ? t('auto.yes', { title: habit.title }) : t('auto.notYet')}</Text>
        <View style={styles.row}>
          {offerReminderOff ? (
            <Button
              label={t('auto.reminderOff')}
              onPress={() => {
                runDetached(updateHabit(habit.id, { reminder: 'off' }));
                setAnswered(null);
              }}
              style={{ flex: 1 }}
            />
          ) : null}
          <Button label={t('common.done')} variant="ghost" onPress={() => setAnswered(null)} style={{ flex: 1 }} />
        </View>
      </View>
    );
  }

  const habit = pending;
  if (!habit) return null;

  return (
    <View style={styles.card}>
      <Text style={typography.label}>{t('auto.title', { title: habit.title })}</Text>
      <Text style={typography.caption}>{t('auto.lead')}</Text>
      <View style={styles.row}>
        {SCORES.map((score) => (
          <Chip
            key={score}
            label={String(score)}
            selected={false}
            accessibilityLabel={t('auto.scoreA11y', { score, low: t('auto.low'), high: t('auto.high') })}
            onPress={() => {
              save({ ...answers, [habit.id]: score, [LAST_ASKED]: today });
              setAnswered({ habitId: habit.id, score });
            }}
          />
        ))}
      </View>
      <View style={styles.scale}>
        <Text style={typography.caption}>{t('auto.low')}</Text>
        <Text style={typography.caption}>{t('auto.high')}</Text>
      </View>
      <Button label={t('auto.later')} variant="ghost" onPress={() => save({ ...answers, [habit.id]: addDays(today, 7), [LAST_ASKED]: today })} />
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  scale: { flexDirection: 'row', justifyContent: 'space-between' },
}));
