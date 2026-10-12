import type { Habit } from './models';

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
