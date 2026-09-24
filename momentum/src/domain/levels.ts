import { addDays, type LocalDateString } from '@/core/localDate';
import { habitStartDate, isHabitDueOn } from './habitSchedule';
import type { Habit } from './models';
import type { StatusByDate } from './streaks';

/** Atomic Habits: look at the last week of scheduled days before deciding. */
export const LEVEL_WINDOW_DAYS = 7;
const UP_THRESHOLD = 6;
const DOWN_THRESHOLD = 3;
/** Pause between suggestions so each level gets a fair trial. */
export const LEVEL_SNOOZE_DAYS = 7;

export type LevelSuggestion =
  | { kind: 'up'; habitId: string; from: number; to: number; completed: number; window: number }
  | { kind: 'down'; habitId: string; from: number; to: number; missed: number; window: number }
  | { kind: 'goal_reached'; habitId: string; target: number };

type LevelHabit = Pick<
  Habit,
  'id' | 'createdAt' | 'targetFrequency' | 'targetDays' | 'isQuantitative' | 'targetCount' | 'growthMode' | 'goalCount' | 'levelStep' | 'levelSnoozeUntil'
>;

/** Default step: a quarter of the current target, at least 1 (small, sustainable jumps). */
export function defaultStep(target: number): number {
  return Math.max(1, Math.round(target * 0.25));
}

/** The last `LEVEL_WINDOW_DAYS` scheduled days before today, or null if there aren't enough yet. */
function recentScheduledDays(habit: LevelHabit, today: LocalDateString): LocalDateString[] | null {
  const start = habitStartDate(habit);
  const days: LocalDateString[] = [];
  let cursor = addDays(today, -1);
  for (let i = 0; i < 60 && cursor >= start && days.length < LEVEL_WINDOW_DAYS; i += 1) {
    if (isHabitDueOn(habit, cursor)) days.push(cursor);
    cursor = addDays(cursor, -1);
  }
  return days.length === LEVEL_WINDOW_DAYS ? days : null;
}

/**
 * Suggests (never applies) a level change for a growing habit:
 * - up after ≥6 of the last 7 scheduled days were completed,
 * - "goal reached" when it is already at its long-term goal,
 * - down after ≥3 misses, so the habit survives instead of being abandoned.
 * Skipped and frozen days are neutral. Maintain habits never get suggestions.
 */
export function suggestLevelChange(habit: LevelHabit, statuses: StatusByDate, today: LocalDateString): LevelSuggestion | null {
  if (habit.growthMode !== 'grow' || !habit.isQuantitative) return null;
  if (habit.levelSnoozeUntil && today <= habit.levelSnoozeUntil) return null;
  const days = recentScheduledDays(habit, today);
  if (!days) return null;

  let completed = 0;
  let missed = 0;
  for (const day of days) {
    const status = statuses.get(day);
    if (status === 'completed') completed += 1;
    else if (status !== 'skipped' && status !== 'forgiven') missed += 1;
  }

  const target = habit.targetCount;
  const step = habit.levelStep ?? defaultStep(target);
  const goal = habit.goalCount;

  if (completed >= UP_THRESHOLD) {
    if (goal !== null && target >= goal) return { kind: 'goal_reached', habitId: habit.id, target };
    const to = goal !== null ? Math.min(goal, target + step) : target + step;
    return { kind: 'up', habitId: habit.id, from: target, to, completed, window: days.length };
  }
  if (missed >= DOWN_THRESHOLD && target > 1) {
    return { kind: 'down', habitId: habit.id, from: target, to: Math.max(1, target - step), missed, window: days.length };
  }
  return null;
}
