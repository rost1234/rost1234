import type { LocalDateString } from '@/core/localDate';
import { habitDayState, indexLogs, type HeatCellState } from './analytics';
import { completionRatio, progressOf } from './habitProgress';
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

function dayOf(habits: readonly Habit[], index: LogIndex, pauses: readonly Pause[], date: LocalDateString, today: LocalDateString): CalendarDay {
  const pause = activePause(pauses, date);
  if (date > today) return { date, future: true, percent: null, perfect: false, freezes: 0, pause };

  let counted = 0;
  let done = 0;
  let freezes = 0;
  for (const habit of habits) {
    const log = index.get(habit.id)?.get(date);
    switch (habitDayState(habit, log, date, today, pauses)) {
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
  return dates.map((date) => dayOf(selected, index, pauses, date, today));
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
      return { habit, state: habitDayState(habit, log, date, today, pauses), count: log?.currentCount ?? 0 };
    })
    .filter((d) => d.state !== 'not_scheduled');
}
