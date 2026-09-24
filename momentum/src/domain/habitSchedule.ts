import { getWeekday, localDateFromIso, type LocalDateString } from '@/core/localDate';
import type { Habit } from './models';

type ScheduledHabit = Pick<Habit, 'targetFrequency' | 'targetDays'>;

/** Whether the habit is scheduled on the given local date. */
export function isHabitDueOn(habit: ScheduledHabit, date: LocalDateString): boolean {
  switch (habit.targetFrequency) {
    case 'daily':
      return true;
    case 'specific_days':
      return habit.targetDays.includes(getWeekday(date));
  }
}

/** The local date the habit started being tracked. */
export function habitStartDate(habit: Pick<Habit, 'createdAt'>): LocalDateString {
  return localDateFromIso(habit.createdAt);
}

export function habitsDueOn<T extends ScheduledHabit & Pick<Habit, 'isArchived'>>(
  habits: readonly T[],
  date: LocalDateString,
): T[] {
  return habits.filter((habit) => !habit.isArchived && isHabitDueOn(habit, date));
}
