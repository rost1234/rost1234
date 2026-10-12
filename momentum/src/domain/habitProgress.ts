import type { Habit, HabitLog, HabitLogStatus } from './models';

type ProgressHabit = Pick<Habit, 'isQuantitative' | 'targetCount'>;

export interface LogProgress {
  currentCount: number;
  status: HabitLogStatus;
}

const EMPTY: LogProgress = { currentCount: 0, status: 'in_progress' };

export function progressOf(log: HabitLog | undefined): LogProgress {
  return log ? { currentCount: log.currentCount, status: log.status } : EMPTY;
}

function statusForCount(habit: ProgressHabit, count: number): HabitLogStatus {
  return count >= habit.targetCount ? 'completed' : 'in_progress';
}

/** Quantitative habits: +1 per tap; completes once the target is reached. */
export function incrementProgress(habit: ProgressHabit, current: LogProgress): LogProgress {
  const currentCount = current.currentCount + 1;
  return { currentCount, status: statusForCount(habit, currentCount) };
}

/** Quantitative habits: undo one step (never below zero). */
export function decrementProgress(habit: ProgressHabit, current: LogProgress): LogProgress {
  const currentCount = Math.max(0, current.currentCount - 1);
  return { currentCount, status: statusForCount(habit, currentCount) };
}

/** Binary habits: a single tap toggles completed ⇄ in_progress. */
export function toggleBinary(current: LogProgress): LogProgress {
  return current.status === 'completed'
    ? { currentCount: 0, status: 'in_progress' }
    : { currentCount: 1, status: 'completed' };
}

/** Quantitative habits: the amount set directly ("I did 2 of 3 sets"), never below zero. */
export function setAmount(habit: ProgressHabit, count: number): LogProgress {
  const currentCount = Math.max(0, Math.round(count));
  return { currentCount, status: statusForCount(habit, currentCount) };
}

/** Next state for the habit card's primary tap. */
export function applyPrimaryAction(habit: ProgressHabit, current: LogProgress): LogProgress {
  return habit.isQuantitative ? incrementProgress(habit, current) : toggleBinary(current);
}

/**
 * A yes/no habit done in part ("only two sets"): kept as in progress with a count of 1, so it
 * reads as partial, never as done, and the next tap completes it.
 */
export const PARTIAL_BINARY: LogProgress = { currentCount: 1, status: 'in_progress' };

export const isPartialBinary = (habit: ProgressHabit, progress: LogProgress): boolean =>
  !habit.isQuantitative && progress.status === 'in_progress' && progress.currentCount > 0;

/** 0..1 completion ratio for one habit on one day. */
export function completionRatio(habit: ProgressHabit, progress: LogProgress): number {
  if (progress.status === 'completed' || progress.status === 'forgiven') return 1;
  if (!habit.isQuantitative) return isPartialBinary(habit, progress) ? 0.5 : 0;
  if (habit.targetCount <= 0) return 0;
  return Math.min(1, progress.currentCount / habit.targetCount);
}

/**
 * Daily progress (0..100) across all habits due today. Skipped habits are
 * excluded from the denominator.
 */
export function dailyProgressPercent(
  items: readonly { habit: ProgressHabit; progress: LogProgress }[],
): number {
  const counted = items.filter((item) => item.progress.status !== 'skipped');
  if (counted.length === 0) return 0;
  const total = counted.reduce((sum, item) => sum + completionRatio(item.habit, item.progress), 0);
  return Math.round((total / counted.length) * 100);
}

/**
 * Re-evaluates a day's progress after the habit's target changed (edit). Skipped
 * and forgiven days keep their status; counts are clamped for binary habits.
 */
export function reevaluateProgress(habit: ProgressHabit, current: LogProgress): LogProgress {
  if (current.status === 'skipped' || current.status === 'forgiven') return current;
  // A yes/no habit marked "in part" stays in part.
  if (!habit.isQuantitative && current.status === 'in_progress') return { currentCount: Math.min(1, current.currentCount), status: 'in_progress' };
  const currentCount = habit.isQuantitative ? current.currentCount : Math.min(1, current.currentCount);
  return { currentCount, status: statusForCount(habit, currentCount) };
}
