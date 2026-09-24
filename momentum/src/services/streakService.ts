import { addDays, type LocalDateString } from '@/core/localDate';
import { inTransaction, repositories } from '@/data/repositories';
import type { Habit, HabitLog, HabitLogStatus } from '@/domain/models';
import { MAX_STREAK_FREEZES, shouldAwardFreeze } from '@/domain/freezeRewards';
import { applyPausesToAll } from '@/domain/pauses';
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
  /** True when a perfect week just earned a new freeze. */
  freezeAwarded: boolean;
}

/**
 * Runs once per dashboard load:
 * 1. A perfect week (7 days ending yesterday) earns +1 freeze, up to the cap.
 * 2. Missed days that interrupt a live streak are forgiven with freezes.
 * Forgiven logs and the freeze deduction are committed atomically.
 */
export async function reconcileStreakFreezes(
  habits: readonly Habit[],
  today: LocalDateString,
): Promise<ReconcileResult> {
  const settings = await repositories.settings.get();
  if (habits.length === 0) {
    return { forgivenDays: 0, freezesRemaining: Math.max(0, settings.streakFreezesAvailable), freezeAwarded: false };
  }

  const [logs, pauses] = await Promise.all([
    repositories.habitLogs.getInRange(historyStart(today), addDays(today, -1)),
    repositories.pauses.getAll(),
  ]);
  // Paused days are neutral: no freezes are spent on them and streaks survive.
  const statuses: ReadonlyMap<string, StatusByDate> = applyPausesToAll(
    statusesByHabit(logs),
    habits.map((h) => h.id),
    pauses,
    addDays(today, -1),
  );

  let freezes = settings.streakFreezesAvailable;
  const freezeAwarded = shouldAwardFreeze(habits, statuses, today, freezes, settings.lastFreezeAwardDate);
  if (freezeAwarded) {
    freezes = await repositories.settings.awardStreakFreeze(today, MAX_STREAK_FREEZES);
  }

  const plan = planStreakFreezes(habits, statuses, today, freezes);
  if (plan.freezesUsed === 0) {
    return { forgivenDays: 0, freezesRemaining: freezes, freezeAwarded };
  }

  const freezesRemaining = await inTransaction('streaks.applyFreezes', async (repos) => {
    await repos.habitLogs.forgive(
      plan.items.flatMap((item) => item.dates.map((logDate) => ({ habitId: item.habitId, logDate }))),
    );
    return repos.settings.consumeStreakFreezes(plan.freezesUsed);
  });

  return { forgivenDays: plan.freezesUsed, freezesRemaining, freezeAwarded };
}
