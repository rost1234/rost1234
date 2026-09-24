import { formatFriendlyDate, type LocalDateString } from '@/core/localDate';
import { dailyProgressPercent, progressOf } from '@/domain/habitProgress';
import { habitsDueOn } from '@/domain/habitSchedule';
import type { Habit, HabitLog } from '@/domain/models';

export interface WidgetHabitRow {
  habitId: string;
  title: string;
  /** e.g. "2/4 glasses", "Done", "Skipped" or "" for an untouched binary habit. */
  detail: string;
  isDone: boolean;
  isSkipped: boolean;
}

export type TodayWidgetModel =
  | { kind: 'setup' }
  | { kind: 'ready'; dateLabel: string; percent: number; rows: WidgetHabitRow[]; hiddenCount: number };

function detailFor(habit: Habit, log: HabitLog | undefined): Pick<WidgetHabitRow, 'detail' | 'isDone' | 'isSkipped'> {
  const progress = progressOf(log);
  const isDone = progress.status === 'completed';
  const isSkipped = progress.status === 'skipped';
  if (isSkipped) return { detail: 'Skipped', isDone, isSkipped };
  if (habit.isQuantitative) {
    const unit = habit.unit ? ` ${habit.unit}` : '';
    return { detail: `${progress.currentCount}/${habit.targetCount}${unit}`, isDone, isSkipped };
  }
  return { detail: isDone ? 'Done' : '', isDone, isSkipped };
}

/**
 * Pure view-model for the home-screen widget. Open habits come first so the
 * rows that still need a tap are always visible in a small widget.
 */
export function buildTodayWidgetModel(
  habits: readonly Habit[],
  todayLogs: readonly HabitLog[],
  today: LocalDateString,
  maxRows: number,
  isOnboarded: boolean,
): TodayWidgetModel {
  if (!isOnboarded) return { kind: 'setup' };
  const logByHabit = new Map(todayLogs.map((log) => [log.habitId, log] as const));
  const due = habitsDueOn(habits, today);

  const rows = due
    .map((habit) => ({ habitId: habit.id, title: habit.title, ...detailFor(habit, logByHabit.get(habit.id)) }))
    .sort((a, b) => Number(a.isDone || a.isSkipped) - Number(b.isDone || b.isSkipped));

  const visible = Math.max(0, Math.floor(maxRows));
  return {
    kind: 'ready',
    dateLabel: formatFriendlyDate(today),
    percent: dailyProgressPercent(due.map((habit) => ({ habit, progress: progressOf(logByHabit.get(habit.id)) }))),
    rows: rows.slice(0, visible),
    hiddenCount: Math.max(0, rows.length - visible),
  };
}

/** How many habit rows fit in a widget of the given height (dp). */
export function rowsForHeight(heightDp: number): number {
  const HEADER_DP = 44;
  const ROW_DP = 36;
  return Math.max(1, Math.floor((heightDp - HEADER_DP) / ROW_DP));
}
