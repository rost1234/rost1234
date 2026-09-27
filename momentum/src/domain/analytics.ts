import type { LocalDateString } from '@/core/localDate';
import { completionRatio, dailyProgressPercent, progressOf } from './habitProgress';
import { habitStartDate, isHabitDueOn } from './habitSchedule';
import type { DailyReflection, Habit, HabitLog, MoodScore, Pause } from './models';
import { isPaused } from './pauses';

export type HeatCellState =
  | 'completed'
  | 'partial'
  | 'missed'
  | 'forgiven'
  | 'skipped'
  | 'paused'
  | 'pending'
  | 'not_scheduled';

export interface HeatCell {
  date: LocalDateString;
  state: HeatCellState;
}

export interface HeatRow {
  habitId: string;
  title: string;
  cells: HeatCell[];
}

export interface TrendPoint {
  date: LocalDateString;
  mood: MoodScore | null;
  completionPercent: number | null;
}

/** Index logs by habit → date for O(1) lookups. */
export function indexLogs(logs: readonly HabitLog[]): Map<string, Map<LocalDateString, HabitLog>> {
  const index = new Map<string, Map<LocalDateString, HabitLog>>();
  for (const log of logs) {
    let byDate = index.get(log.habitId);
    if (!byDate) {
      byDate = new Map();
      index.set(log.habitId, byDate);
    }
    byDate.set(log.logDate, log);
  }
  return index;
}

function cellState(habit: Habit, log: HabitLog | undefined, date: LocalDateString, today: LocalDateString): HeatCellState {
  if (date < habitStartDate(habit) || !isHabitDueOn(habit, date)) return 'not_scheduled';
  const progress = progressOf(log);
  switch (progress.status) {
    case 'completed':
      return 'completed';
    case 'forgiven':
      return 'forgiven';
    case 'skipped':
      return 'skipped';
    case 'in_progress':
      if (completionRatio(habit, progress) > 0) return 'partial';
      return date === today ? 'pending' : 'missed';
  }
}

/** One habit on one day. A planned pause turns a miss (or an open day) into `paused`. */
export function habitDayState(
  habit: Habit,
  log: HabitLog | undefined,
  date: LocalDateString,
  today: LocalDateString,
  pauses: readonly Pause[],
): HeatCellState {
  const state = cellState(habit, log, date, today);
  return (state === 'missed' || state === 'pending') && isPaused(pauses, date, habit.id) ? 'paused' : state;
}

export function buildHeatmap(
  habits: readonly Habit[],
  logs: readonly HabitLog[],
  dates: readonly LocalDateString[],
  today: LocalDateString,
  pauses: readonly Pause[] = [],
): HeatRow[] {
  const index = indexLogs(logs);
  return habits.map((habit) => {
    const byDate = index.get(habit.id);
    return {
      habitId: habit.id,
      title: habit.title,
      cells: dates.map((date) => ({ date, state: habitDayState(habit, byDate?.get(date), date, today, pauses) })),
    };
  });
}

/** Completion % for one day, or null when nothing was scheduled. */
export function completionForDate(
  habits: readonly Habit[],
  index: ReadonlyMap<string, ReadonlyMap<LocalDateString, HabitLog>>,
  date: LocalDateString,
): number | null {
  const due = habits.filter((habit) => date >= habitStartDate(habit) && isHabitDueOn(habit, date));
  if (due.length === 0) return null;
  return dailyProgressPercent(
    due.map((habit) => ({ habit, progress: progressOf(index.get(habit.id)?.get(date)) })),
  );
}

export function buildTrend(
  habits: readonly Habit[],
  logs: readonly HabitLog[],
  reflections: readonly DailyReflection[],
  dates: readonly LocalDateString[],
): TrendPoint[] {
  const index = indexLogs(logs);
  const moodByDate = new Map(reflections.map((r) => [r.logDate, r.moodScore] as const));
  return dates.map((date) => ({
    date,
    mood: moodByDate.get(date) ?? null,
    completionPercent: completionForDate(habits, index, date),
  }));
}

export function averageOf(values: readonly (number | null)[]): number | null {
  const present = values.filter((v): v is number => v !== null);
  if (present.length === 0) return null;
  return present.reduce((sum, v) => sum + v, 0) / present.length;
}
