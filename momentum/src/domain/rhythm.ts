import { addDays, getWeekday, type LocalDateString, type Weekday } from '@/core/localDate';
import { isHabitDueOn } from './habitSchedule';
import type { Habit, HabitLog, TimeOfDay } from './models';

/** Streak lengths worth a small celebration (no points, no badges). */
export const MILESTONES = [7, 30, 100, 365] as const;

/** The milestone crossed when a streak moves from `before` to `after`, if any. */
export function crossedMilestone(before: number, after: number): number | null {
  return MILESTONES.find((m) => before < m && after >= m) ?? null;
}

export function timeOfDayNow(hour: number): Exclude<TimeOfDay, 'any'> {
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

const ORDER: Exclude<TimeOfDay, 'any'>[] = ['morning', 'afternoon', 'evening'];

/**
 * Today's order: the current part of the day first, then later ones, then
 * earlier ones; "any time" habits stay with the current block. Stable within
 * a block, so habit stacking order is preserved.
 */
export function orderByTimeOfDay<T extends Pick<Habit, 'timeOfDay'>>(habits: readonly T[], hour: number): T[] {
  const now = timeOfDayNow(hour);
  const nowIndex = ORDER.indexOf(now);
  const rank = (tod: TimeOfDay) => {
    if (tod === 'any') return 0;
    const i = ORDER.indexOf(tod);
    return i >= nowIndex ? i - nowIndex : ORDER.length + i;
  };
  return habits
    .map((habit, index) => ({ habit, index }))
    .sort((a, b) => rank(a.habit.timeOfDay) - rank(b.habit.timeOfDay) || a.index - b.index)
    .map((x) => x.habit);
}

const DEFAULT_MINUTES: Record<TimeOfDay, number> = { any: 10 * 60, morning: 8 * 60, afternoon: 13 * 60, evening: 19 * 60 };

/**
 * "Usual time" for a smart reminder: the median time of day the habit was
 * completed (last 30 logs), 15 minutes earlier, rounded to 5 min. Falls back to
 * the habit's part of the day.
 */
export function usualReminderMinutes(
  habit: Pick<Habit, 'timeOfDay'>,
  logs: readonly Pick<HabitLog, 'status' | 'updatedAt' | 'logDate'>[],
  weekday?: Weekday,
): number {
  const completed = logs.filter((l) => l.status === 'completed');
  // Weekends often run on a different clock: prefer the same weekday when there's enough of it.
  if (weekday !== undefined) {
    const sameDay = completed.slice(-60).filter((l) => getWeekday(l.logDate) === weekday);
    if (sameDay.length >= 3) return usualReminderMinutes(habit, sameDay);
  }
  const minutes = completed
    .slice(-30)
    .map((l) => {
      const d = new Date(l.updatedAt);
      return d.getHours() * 60 + d.getMinutes();
    })
    .sort((a, b) => a - b);
  if (minutes.length < 3) return DEFAULT_MINUTES[habit.timeOfDay];
  const median = minutes[Math.floor(minutes.length / 2)] ?? DEFAULT_MINUTES[habit.timeOfDay];
  return Math.max(6 * 60, Math.round((median - 15) / 5) * 5);
}

/** Upcoming days (from today, `days` long) when a reminder is needed: scheduled and not done yet. */
export function reminderDates(
  habit: Pick<Habit, 'targetFrequency' | 'targetDays'>,
  today: LocalDateString,
  doneToday: boolean,
  days = 7,
): LocalDateString[] {
  const result: LocalDateString[] = [];
  for (let i = 0; i < days; i += 1) {
    const date = addDays(today, i);
    if (i === 0 && doneToday) continue;
    if (isHabitDueOn(habit, date)) result.push(date);
  }
  return result;
}
