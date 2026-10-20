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

/** How one habit went in the range, in plain counts. */
export interface HabitTally {
  habitId: string;
  title: string;
  done: number;
  /** Days it was asked for (skipped, paused and future days don't count). */
  due: number;
}

const COUNTED: ReadonlySet<HeatCellState> = new Set(['completed', 'partial', 'missed', 'forgiven']);

/** Done out of due for each habit (a freeze-kept day counts as kept). */
export function habitTallies(rows: readonly HeatRow[]): HabitTally[] {
  return rows.map((row) => ({
    habitId: row.habitId,
    title: row.title,
    done: row.cells.filter((c) => c.state === 'completed' || c.state === 'forgiven').length,
    due: row.cells.filter((c) => COUNTED.has(c.state)).length,
  }));
}

/** The range in a few plain facts, for sentences instead of charts. */
export interface ProgressStory {
  /** Done out of due across all habits, 0–100 (null when nothing was due): the same counts as the bars. */
  percent: number | null;
  /** Days with anything done. */
  activeDays: number;
  /** Days on which something was due (paused and fully skipped days don't count). */
  days: number;
  /** The habit that went best (asked for 3+ times). */
  best: HabitTally | null;
  /** The habit that was hardest (asked for 3+ times, under 60%; never a habit to quit). */
  hardest: HabitTally | null;
  /** Mood on fuller days minus mood on lighter days, when there's enough to say (≥3 of each). */
  moodLift: number | null;
}

const MIN_DUE = 3;

export function progressStory(rows: readonly HeatRow[], trend: readonly TrendPoint[], quitIds: ReadonlySet<string> = new Set()): ProgressStory {
  const all = habitTallies(rows);
  const due = all.reduce((sum, h) => sum + h.due, 0);
  const done = all.reduce((sum, h) => sum + h.done, 0);
  const tallies = all.filter((h) => h.due >= MIN_DUE);
  const ratio = (h: HabitTally) => h.done / h.due;
  const sorted = [...tallies].sort((a, b) => ratio(b) - ratio(a) || b.due - a.due);
  const best = sorted[0] && ratio(sorted[0]) > 0 ? sorted[0] : null;
  const hardest = [...sorted].reverse().find((h) => h !== best && !quitIds.has(h.habitId) && ratio(h) < 0.6) ?? null;

  // Days come from the same cells as the bars, so pauses and skips never count against a day.
  const dueDays = new Set<string>();
  const activeDays = new Set<string>();
  for (const row of rows) {
    for (const cell of row.cells) {
      if (COUNTED.has(cell.state)) dueDays.add(cell.date);
      if (cell.state === 'completed' || cell.state === 'forgiven') activeDays.add(cell.date);
    }
  }

  const fuller = trend.filter((p) => p.mood !== null && (p.completionPercent ?? 0) >= 50).map((p) => p.mood as number);
  const lighter = trend.filter((p) => p.mood !== null && p.completionPercent !== null && p.completionPercent < 50).map((p) => p.mood as number);
  const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const moodLift = fuller.length >= 3 && lighter.length >= 3 ? Math.round((avg(fuller) - avg(lighter)) * 10) / 10 : null;

  return { percent: due > 0 ? Math.round((done / due) * 100) : null, activeDays: activeDays.size, days: dueDays.size, best, hardest, moodLift };
}
