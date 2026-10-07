import type { LocalDateString } from '@/core/localDate';
import { habitDayState, indexLogs, type HeatCellState } from './analytics';
import { completionRatio, decrementProgress, incrementProgress, progressOf, type LogProgress } from './habitProgress';
import type { Habit, HabitLog, Pause } from './models';
import { activePause } from './pauses';

export interface CalendarDay {
  date: LocalDateString;
  future: boolean;
  /**
   * 0..100 across the habits that counted that day (skipped, paused and
   * unscheduled habits don't count; a frozen habit counts as not done).
   * `null` when nothing counted.
   */
  percent: number | null;
  /** Everything that counted was done, without help from a freeze. */
  perfect: boolean;
  /** Habits a streak freeze covered that day. */
  freezes: number;
  pause: Pause | null;
}

export interface MonthSummary {
  perfectDays: number;
  freezesUsed: number;
  pausedDays: number;
  averagePercent: number | null;
}

export interface HabitDayDetail {
  habit: Habit;
  state: HeatCellState;
  count: number;
}

type LogIndex = ReadonlyMap<string, ReadonlyMap<LocalDateString, HabitLog>>;

/**
 * Archived habits have no archive date, so they only count on days they were
 * actually logged; otherwise every day after archiving would read as a miss.
 */
function stateOf(habit: Habit, log: HabitLog | undefined, date: LocalDateString, today: LocalDateString, pauses: readonly Pause[]): HeatCellState {
  if (habit.isArchived && !log) return 'not_scheduled';
  return habitDayState(habit, log, date, today, pauses);
}

function dayOf(
  habits: readonly Habit[],
  index: LogIndex,
  pauses: readonly Pause[],
  date: LocalDateString,
  today: LocalDateString,
  habitId: string | null,
): CalendarDay {
  // All habits: only app-wide pauses make a band (a paused habit just doesn't count that day).
  const pause = activePause(pauses, date, habitId ?? undefined);
  if (date > today) return { date, future: true, percent: null, perfect: false, freezes: 0, pause };

  let counted = 0;
  let done = 0;
  let freezes = 0;
  for (const habit of habits) {
    const log = index.get(habit.id)?.get(date);
    switch (stateOf(habit, log, date, today, pauses)) {
      case 'not_scheduled':
      case 'skipped':
      case 'paused':
        break;
      case 'forgiven':
        counted += 1;
        freezes += 1;
        break;
      case 'completed':
        counted += 1;
        done += 1;
        break;
      case 'partial':
        counted += 1;
        done += completionRatio(habit, progressOf(log));
        break;
      case 'missed':
      case 'pending':
        counted += 1;
        break;
    }
  }
  const percent = counted === 0 ? null : Math.round((done / counted) * 100);
  return { date, future: false, percent, perfect: percent === 100 && freezes === 0, freezes, pause };
}

/** One summary per date; pass `habitId` to look at a single habit. */
export function buildCalendarDays(
  habits: readonly Habit[],
  logs: readonly HabitLog[],
  pauses: readonly Pause[],
  dates: readonly LocalDateString[],
  today: LocalDateString,
  habitId: string | null = null,
): CalendarDay[] {
  const index = indexLogs(logs);
  const selected = habitId ? habits.filter((h) => h.id === habitId) : habits;
  return dates.map((date) => dayOf(selected, index, pauses, date, today, habitId));
}

export function summarizeMonth(days: readonly CalendarDay[]): MonthSummary {
  const past = days.filter((d) => !d.future);
  const percents = past.map((d) => d.percent).filter((p): p is number => p !== null);
  return {
    perfectDays: past.filter((d) => d.perfect).length,
    freezesUsed: past.reduce((sum, d) => sum + d.freezes, 0),
    pausedDays: past.filter((d) => d.pause !== null).length,
    averagePercent: percents.length === 0 ? null : Math.round(percents.reduce((a, b) => a + b, 0) / percents.length),
  };
}

/** Every habit that was scheduled on `date`, with what happened to it. */
export function habitDayDetails(
  habits: readonly Habit[],
  logs: readonly HabitLog[],
  pauses: readonly Pause[],
  date: LocalDateString,
  today: LocalDateString,
): HabitDayDetail[] {
  const index = indexLogs(logs);
  return habits
    .map((habit) => {
      const log = index.get(habit.id)?.get(date);
      return { habit, state: stateOf(habit, log, date, today, pauses), count: log?.currentCount ?? 0 };
    })
    .filter((d) => d.state !== 'not_scheduled');
}

export type DayEditAction = 'done' | 'undo' | 'plus' | 'minus' | 'skip' | 'unskip';

/**
 * What can be changed on a past or current day for one habit, in menu order. A day a
 * streak freeze covered can only be marked done (which gives the freeze back). Skipping
 * is for today only: skipping a past day would be a free streak saver, and after a freeze
 * was given back it would keep it.
 */
export function dayEditActions(
  habit: Pick<Habit, 'isQuantitative'>,
  state: HeatCellState,
  count: number,
  isToday: boolean,
): DayEditAction[] {
  if (state === 'not_scheduled') return [];
  if (state === 'forgiven') return ['done'];
  if (state === 'skipped') return isToday ? ['unskip', 'done'] : ['done'];
  const actions: DayEditAction[] = [];
  if (state !== 'completed') actions.push('done');
  if (habit.isQuantitative) {
    if (state !== 'completed') actions.push('plus');
    if (count > 0) actions.push('minus');
  }
  if (state === 'completed' || count > 0) actions.push('undo');
  if (isToday) actions.push('skip');
  return actions;
}

/** The log a day edit produces; `current` is what the day holds now. */
export function applyDayEdit(
  habit: Pick<Habit, 'isQuantitative' | 'targetCount'>,
  current: LogProgress,
  action: DayEditAction,
): LogProgress {
  switch (action) {
    case 'done':
      return { currentCount: habit.isQuantitative ? habit.targetCount : 1, status: 'completed' };
    case 'undo':
      return { currentCount: 0, status: 'in_progress' };
    case 'plus':
      return incrementProgress(habit, current);
    case 'minus':
      return decrementProgress(habit, current);
    case 'skip':
      return { currentCount: current.currentCount, status: 'skipped' };
    case 'unskip':
      return { currentCount: current.currentCount, status: 'in_progress' };
  }
}
