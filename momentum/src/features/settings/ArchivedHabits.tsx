import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/AppText';
import { Banner, Button, Card } from '@/components/ui';
import { spacing, useTheme } from '@/components/theme';
import { runDetached, toErrorMessage } from '@/core/errors';
import { haptics } from '@/core/haptics';
import { localDateFromIso, formatFriendlyDate } from '@/core/localDate';
import { repositories } from '@/data/repositories';
import type { Habit } from '@/domain/models';
import { useT } from '@/i18n';
import { useHabitStore } from '@/state/habitStore';

/** Habits moved to the archive, each with a way back (its history was kept). */
export function ArchivedHabits() {
  const t = useT();
  const { typography } = useTheme();
  const restoreHabit = useHabitStore((s) => s.restoreHabit);
  const [habits, setHabits] = useState<Habit[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    () =>
      repositories.habits.getAll({ includeArchived: true }).then(
        (all) => setHabits(all.filter((h) => h.isArchived)),
        (e: unknown) => setError(toErrorMessage(e)),
      ),
    [],
  );
  useEffect(() => {
    runDetached(load());
  }, [load]);

  const restore = (habit: Habit) =>
    runDetached(
      restoreHabit(habit.id).then(
        () => {
          haptics.success();
          return load();
        },
        (e: unknown) => setError(toErrorMessage(e)),
      ),
    );

  return (
    <View style={{ gap: spacing.md }}>
      {error ? <Banner message={error} onDismiss={() => setError(null)} /> : null}
      <Text style={typography.caption}>{t('arch.lead')}</Text>
      {habits !== null && habits.length === 0 ? <Text style={typography.body}>{t('arch.none')}</Text> : null}
      {(habits ?? []).map((habit) => (
        <Card key={habit.id} style={{ gap: spacing.sm }}>
          <Text style={typography.label}>{habit.title}</Text>
          <Text style={typography.caption}>{t('arch.since', { date: formatFriendlyDate(localDateFromIso(habit.createdAt), t.locale) })}</Text>
          <Button label={t('arch.restore')} accessibilityHint={t('arch.restoreA11y', { title: habit.title })} variant="secondary" onPress={() => restore(habit)} />
        </Card>
      ))}
    </View>
  );
}
