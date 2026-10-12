import type { Habit } from './models';

export type HomeItem = { kind: 'habit'; habit: Habit } | { kind: 'group'; name: string; habits: Habit[] };

/**
 * Today's habits with each group folded into one item, placed where its first habit is.
 * A group with only one habit due today shows as that habit on its own.
 */
export function groupForHome(habits: readonly Habit[]): HomeItem[] {
  const byGroup = new Map<string, Habit[]>();
  for (const habit of habits) {
    const name = habit.groupName.trim();
    if (name) byGroup.set(name, [...(byGroup.get(name) ?? []), habit]);
  }
  const items: HomeItem[] = [];
  const placed = new Set<string>();
  for (const habit of habits) {
    const name = habit.groupName.trim();
    const members = name ? byGroup.get(name) : undefined;
    if (!members || members.length < 2) {
      items.push({ kind: 'habit', habit });
    } else if (!placed.has(name)) {
      placed.add(name);
      items.push({ kind: 'group', name, habits: members });
    }
  }
  return items;
}
