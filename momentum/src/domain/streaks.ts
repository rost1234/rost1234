import { addDays, type LocalDateString } from '@/core/localDate';
import { habitStartDate, isHabitDueOn } from './habitSchedule';
import type { Habit, HabitLogStatus } from './models';

type StreakHabit = Pick<Habit, 'id' | 'createdAt' | 'targetFrequency' | 'targetDays'>;

/** Status of each logged day for a single habit. Missing dates = no log. */
export type StatusByDate = ReadonlyMap<LocalDateString, HabitLogStatus>;

/** Hard stop so a corrupted clock can never cause an unbounded walk. */
const MAX_LOOKBACK_DAYS = 3660;

/** Statuses that keep a streak alive without adding to it. */
const BRIDGING: ReadonlySet<HabitLogStatus> = new Set<HabitLogStatus>(['forgiven', 'skipped']);

/**
 * Consecutive scheduled days completed, ending at `today`.
 *
 * - Non-scheduled days are ignored.
 * - Today counts if already completed; an unfinished today never breaks it.
 * - `forgiven` (streak freeze) and `skipped` days bridge the streak.
 */
export function computeStreak(
  habit: StreakHabit,
  statuses: StatusByDate,
  today: LocalDateString,
): number {
  const start = habitStartDate(habit);
  let streak = 0;

  if (isHabitDueOn(habit, today) && statuses.get(today) === 'completed') {
    streak += 1;
  }

  let cursor = addDays(today, -1);
  for (let i = 0; i < MAX_LOOKBACK_DAYS && cursor >= start; i += 1) {
    if (isHabitDueOn(habit, cursor)) {
      const status = statuses.get(cursor);
      if (status === 'completed') {
        streak += 1;
      } else if (!status || !BRIDGING.has(status)) {
        break;
      }
    }
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export interface FreezePlanItem {
  habitId: string;
  /** Missed dates that should be written as `forgiven`. */
  dates: LocalDateString[];
}

export interface FreezePlan {
  items: FreezePlanItem[];
  freezesUsed: number;
}

/**
 * Smart streak freezes. For every habit, looks at the run of missed scheduled
 * days immediately before `today`. If that run interrupts a live streak and the
 * shared pool has enough freezes to cover every missed day, the days are
 * forgiven (1 freeze per day) and the streak survives.
 *
 * The plan is idempotent: once dates are written as `forgiven`, re-running on
 * the same day finds no gap.
 */
export function planStreakFreezes(
  habits: readonly StreakHabit[],
  statusesByHabit: ReadonlyMap<string, StatusByDate>,
  today: LocalDateString,
  freezesAvailable: number,
): FreezePlan {
  let remaining = Math.max(0, freezesAvailable);
  const items: FreezePlanItem[] = [];

  for (const habit of habits) {
    if (remaining === 0) break;
    const statuses = statusesByHabit.get(habit.id) ?? new Map<LocalDateString, HabitLogStatus>();
    const gap = findTrailingGap(habit, statuses, today, remaining);
    if (!gap) continue;

    items.push({ habitId: habit.id, dates: gap });
    remaining -= gap.length;
  }

  return { items, freezesUsed: Math.max(0, freezesAvailable) - remaining };
}

/**
 * Returns the missed scheduled dates between the last resolved day and today,
 * or `null` when there is nothing to protect or not enough freezes.
 */
function findTrailingGap(
  habit: StreakHabit,
  statuses: StatusByDate,
  today: LocalDateString,
  budget: number,
): LocalDateString[] | null {
  const start = habitStartDate(habit);
  const missed: LocalDateString[] = [];
  let cursor = addDays(today, -1);

  for (let i = 0; i < MAX_LOOKBACK_DAYS && cursor >= start; i += 1) {
    if (isHabitDueOn(habit, cursor)) {
      const status = statuses.get(cursor);
      if (status === 'completed' || (status && BRIDGING.has(status))) {
        // Found the anchor: only protect if a real streak lives behind the gap.
        if (missed.length === 0) return null;
        return computeStreak(habit, statuses, cursor) > 0 ? missed.reverse() : null;
      }
      missed.push(cursor);
      if (missed.length > budget) return null;
    }
    cursor = addDays(cursor, -1);
  }
  return null;
}
