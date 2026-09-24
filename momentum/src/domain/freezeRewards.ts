import { addDays, lastNDays, type LocalDateString } from '@/core/localDate';
import { habitStartDate, isHabitDueOn } from './habitSchedule';
import type { Habit } from './models';
import type { StatusByDate } from './streaks';

/** The pool never grows beyond this, so freezes stay a safety net, not a bank. */
export const MAX_STREAK_FREEZES = 3;
export const PERFECT_WEEK_DAYS = 7;

type RewardHabit = Pick<Habit, 'id' | 'createdAt' | 'targetFrequency' | 'targetDays'>;

/**
 * A perfect day: at least one habit was scheduled, every scheduled habit was
 * completed or deliberately skipped, and at least one was actually completed.
 * Forgiven (frozen) days are never perfect — freezes can't earn freezes.
 */
export function isPerfectDay(
  habits: readonly RewardHabit[],
  statusesByHabit: ReadonlyMap<string, StatusByDate>,
  date: LocalDateString,
): boolean {
  const due = habits.filter((habit) => date >= habitStartDate(habit) && isHabitDueOn(habit, date));
  if (due.length === 0) return false;
  let completed = 0;
  for (const habit of due) {
    const status = statusesByHabit.get(habit.id)?.get(date);
    if (status === 'completed') completed += 1;
    else if (status !== 'skipped') return false;
  }
  return completed > 0;
}

/**
 * Earn one freeze for every 7 perfect days in a row (ending yesterday). Weeks
 * never overlap: the whole window must be after the previous award.
 */
export function shouldAwardFreeze(
  habits: readonly RewardHabit[],
  statusesByHabit: ReadonlyMap<string, StatusByDate>,
  today: LocalDateString,
  freezesAvailable: number,
  lastAwardDate: LocalDateString | null,
): boolean {
  if (freezesAvailable >= MAX_STREAK_FREEZES) return false;
  const window = lastNDays(addDays(today, -1), PERFECT_WEEK_DAYS);
  const first = window[0];
  if (!first || (lastAwardDate !== null && lastAwardDate >= first)) return false;
  return window.every((date) => isPerfectDay(habits, statusesByHabit, date));
}
