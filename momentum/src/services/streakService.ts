import { addDays, type LocalDateString } from '@/core/localDate';
import { inTransaction, repositories } from '@/data/repositories';
import type { Habit, HabitLog, HabitLogStatus } from '@/domain/models';
import { planStreakFreezes, type StatusByDate } from '@/domain/streaks';

/** How much history the dashboard keeps in memory for streak maths. */
export const STREAK_HISTORY_DAYS = 400;

export function historyStart(today: LocalDateString): LocalDateString {
  return addDays(today, -STREAK_HISTORY_DAYS);
}

export function statusesByHabit(logs: readonly HabitLog[]): Map<string, Map<LocalDateString, HabitLogStatus>> {
  const result = new Map<string, Map<LocalDateString, HabitLogStatus>>();
  for (const log of logs) {
    let byDate = result.get(log.habitId);
    if (!byDate) {
      byDate = new Map();
      result.set(log.habitId, byDate);
    }
    byDate.set(log.logDate, log.status);
  }
  return result;
}

export interface ReconcileResult {
  forgivenDays: number;
  freezesRemaining: number;
}

/**
 * Applies smart streak freezes for days missed before `today`. Forgiven logs
 * and the freeze deduction are committed atomically.
 */
export async function reconcileStreakFreezes(
  habits: readonly Habit[],
  today: LocalDateString,
): Promise<ReconcileResult> {
  const settings = await repositories.settings.get();
  if (settings.streakFreezesAvailable <= 0 || habits.length === 0) {
    return { forgivenDays: 0, freezesRemaining: Math.max(0, settings.streakFreezesAvailable) };
  }

  const logs = await repositories.habitLogs.getInRange(historyStart(today), addDays(today, -1));
  const statuses: ReadonlyMap<string, StatusByDate> = statusesByHabit(logs);
  const plan = planStreakFreezes(habits, statuses, today, settings.streakFreezesAvailable);

  if (plan.freezesUsed === 0) {
    return { forgivenDays: 0, freezesRemaining: settings.streakFreezesAvailable };
  }

  const freezesRemaining = await inTransaction('streaks.applyFreezes', async (repos) => {
    await repos.habitLogs.forgive(
      plan.items.flatMap((item) => item.dates.map((logDate) => ({ habitId: item.habitId, logDate }))),
    );
    return repos.settings.consumeStreakFreezes(plan.freezesUsed);
  });

  return { forgivenDays: plan.freezesUsed, freezesRemaining };
}
