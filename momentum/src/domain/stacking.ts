import type { Habit } from './models';

/**
 * Habit stacking: each habit linked with `afterHabitId` is placed right after
 * its anchor (chains supported). Unknown or circular links fall back to the
 * original order, so nothing is ever hidden.
 */
export function orderByStacking<T extends Pick<Habit, 'id' | 'afterHabitId'>>(habits: readonly T[]): T[] {
  const ids = new Set(habits.map((h) => h.id));
  const children = new Map<string, T[]>();
  const roots: T[] = [];
  for (const habit of habits) {
    const anchor = habit.afterHabitId;
    if (anchor && anchor !== habit.id && ids.has(anchor)) {
      children.set(anchor, [...(children.get(anchor) ?? []), habit]);
    } else {
      roots.push(habit);
    }
  }

  const result: T[] = [];
  const placed = new Set<string>();
  const place = (habit: T) => {
    if (placed.has(habit.id)) return;
    placed.add(habit.id);
    result.push(habit);
    for (const child of children.get(habit.id) ?? []) place(child);
  };
  roots.forEach(place);
  // Anything only reachable through a cycle keeps its original position at the end.
  habits.forEach(place);
  return result;
}
