import type { Habit, HabitLogStatus } from './models';
import { partOfDayPassed } from './rhythm';

export type HomeItem = { kind: 'habit'; habit: Habit } | { kind: 'group'; name: string; habits: Habit[] };

/**
 * Today's habits with each group folded into one item, placed where its first habit is.
 * A group with only one habit due today shows as that habit on its own.
 */
export function groupForHome(habits: readonly Habit[]): HomeItem[] {
  // "Fitness" and "fitness " are the same group; it shows with the first habit's spelling.
  const keyOf = (habit: Habit) => habit.groupName.trim().toLocaleLowerCase();
  const byGroup = new Map<string, Habit[]>();
  for (const habit of habits) {
    const key = keyOf(habit);
    if (key) byGroup.set(key, [...(byGroup.get(key) ?? []), habit]);
  }
  const items: HomeItem[] = [];
  const placed = new Set<string>();
  for (const habit of habits) {
    const key = keyOf(habit);
    const members = key ? byGroup.get(key) : undefined;
    if (!members || members.length < 2) {
      items.push({ kind: 'habit', habit });
    } else if (!placed.has(key)) {
      placed.add(key);
      items.push({ kind: 'group', name: habit.groupName.trim(), habits: members });
    }
  }
  return items;
}

/**
 * Today's habits split into the open list, the "late" ones (kept for a part of the day that's over,
 * e.g. a morning habit after noon: still on the list, last, with a note that it can still be done)
 * and the ones set aside for today (skipped, or put away with "I didn't do it today").
 * Done habits always stay in the open list, so the day's wins stay in view.
 */
export function setAsideToday<T extends Pick<Habit, 'id' | 'timeOfDay'>>(
  habits: readonly T[],
  statusOf: (habitId: string) => HabitLogStatus | undefined,
  closedIds: readonly string[],
  hour: number,
): { open: T[]; late: T[]; aside: T[] } {
  const open: T[] = [];
  const late: T[] = [];
  const aside: T[] = [];
  for (const habit of habits) {
    const status = statusOf(habit.id);
    if (status === 'skipped' || (status !== 'completed' && closedIds.includes(habit.id))) aside.push(habit);
    else if (status !== 'completed' && partOfDayPassed(habit.timeOfDay, hour)) late.push(habit);
    else open.push(habit);
  }
  return { open, late, aside };
}
