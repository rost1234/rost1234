import { addDays, type LocalDateString } from '@/core/localDate';
import { habitStartDate, isHabitDueOn } from './habitSchedule';
import type { Habit, HabitLogStatus } from './models';

type StreakHabit = Pick<Habit, 'id' | 'createdAt' | 'targetFrequency' | 'targetDays'>;

/**
 * A day's status for streak maths: the log's status, or `small` for a small step (part of the
 * habit done, e.g. 2 of 8 glasses or "did a bit"). Showing up with a small step keeps the habit
 * going, so it counts toward the streak; only a full completion makes a day "perfect".
 */
export type DayStatus = HabitLogStatus | 'small';

/** Status of each logged day for a single habit. Missing dates = no log. */
export type StatusByDate = ReadonlyMap<LocalDateString, DayStatus>;

/** The day was done, fully or with a small step. */
export const countsAsDone = (status: DayStatus | undefined): boolean => status === 'completed' || status === 'small';

/** A day's status from its log: an unfinished day with something done is a small step. */
export const dayStatusOf = (log: { status: HabitLogStatus; currentCount: number }): DayStatus =>
  log.status === 'in_progress' && log.currentCount > 0 ? 'small' : log.status;

/** Rest days ("not today, and that's fine") a habit can take in any 7 days. */
export const REST_DAYS_PER_WEEK = 2;

/** Rest days left today: the cap minus the ones taken in the 6 days before. */
export function restDaysLeft(statuses: StatusByDate, today: LocalDateString): number {
  let used = 0;
  for (let i = 1; i <= 6; i += 1) if (statuses.get(addDays(today, -i)) === 'skipped') used += 1;
  return Math.max(0, REST_DAYS_PER_WEEK - used);
}

/** Hard stop so a corrupted clock can never cause an unbounded walk. */
const MAX_LOOKBACK_DAYS = 3660;

/** Statuses that keep a streak alive without adding to it. */
const BRIDGING: ReadonlySet<DayStatus> = new Set<DayStatus>(['forgiven', 'skipped']);

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

  if (isHabitDueOn(habit, today) && countsAsDone(statuses.get(today))) {
    streak += 1;
  }

  let cursor = addDays(today, -1);
  for (let i = 0; i < MAX_LOOKBACK_DAYS && cursor >= start; i += 1) {
    if (isHabitDueOn(habit, cursor)) {
      const status = statuses.get(cursor);
      if (countsAsDone(status)) {
        streak += 1;
      } else if (!status || !BRIDGING.has(status)) {
        break;
      }
    }
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/**
 * Clean days in a row for a habit to quit. Not opening the app isn't a slip, so a day nobody
 * marked waits (it neither adds nor breaks); only a recorded slip breaks the run. A clean day (✓)
 * adds one. No freezes are ever spent on these habits.
 */
export function computeQuitStreak(
  habit: StreakHabit,
  statuses: StatusByDate,
  slips: ReadonlySet<LocalDateString>,
  today: LocalDateString,
): number {
  const start = habitStartDate(habit);
  let streak = 0;
  if (isHabitDueOn(habit, today) && statuses.get(today) === 'completed') streak += 1;
  else if (slips.has(today)) return 0;

  let cursor = addDays(today, -1);
  for (let i = 0; i < MAX_LOOKBACK_DAYS && cursor >= start; i += 1) {
    if (isHabitDueOn(habit, cursor)) {
      if (statuses.get(cursor) === 'completed') streak += 1;
      else if (slips.has(cursor)) break;
    }
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** True when the habit was completed at least once before `date` (for "fresh start" copy). */
export function hasCompletionBefore(statuses: StatusByDate, date: LocalDateString): boolean {
  for (const [logDate, status] of statuses) {
    if (logDate < date && countsAsDone(status)) return true;
  }
  return false;
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

  // When there aren't enough freezes for every habit, the longest streaks are kept first:
  // losing a long run is what makes people give up on a habit altogether.
  const candidates = habits
    .map((habit) => ({ habit, gap: findTrailingGap(habit, statusesByHabit.get(habit.id) ?? new Map<LocalDateString, HabitLogStatus>(), today, remaining) }))
    .filter((c): c is { habit: StreakHabit; gap: TrailingGap } => c.gap !== null)
    .sort((a, b) => b.gap.streak - a.gap.streak);

  for (const { habit, gap } of candidates) {
    if (remaining === 0) break;
    if (gap.dates.length > remaining) continue;
    items.push({ habitId: habit.id, dates: gap.dates });
    remaining -= gap.dates.length;
  }

  return { items, freezesUsed: Math.max(0, freezesAvailable) - remaining };
}

/**
 * Returns the missed scheduled dates between the last resolved day and today,
 * or `null` when there is nothing to protect or not enough freezes.
 */
interface TrailingGap {
  dates: LocalDateString[];
  /** The streak the gap would keep. */
  streak: number;
}

function findTrailingGap(
  habit: StreakHabit,
  statuses: StatusByDate,
  today: LocalDateString,
  budget: number,
): TrailingGap | null {
  const start = habitStartDate(habit);
  const missed: LocalDateString[] = [];
  let cursor = addDays(today, -1);

  for (let i = 0; i < MAX_LOOKBACK_DAYS && cursor >= start; i += 1) {
    if (isHabitDueOn(habit, cursor)) {
      const status = statuses.get(cursor);
      if (countsAsDone(status) || (status && BRIDGING.has(status))) {
        // Found the anchor: only protect if a real streak lives behind the gap.
        if (missed.length === 0) return null;
        const streak = computeStreak(habit, statuses, cursor);
        return streak > 0 ? { dates: missed.reverse(), streak } : null;
      }
      missed.push(cursor);
      if (missed.length > budget) return null;
    }
    cursor = addDays(cursor, -1);
  }
  return null;
}
