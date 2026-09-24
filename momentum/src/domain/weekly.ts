import { addDays, dateRange, getWeekday, type LocalDateString } from '@/core/localDate';
import { progressOf } from './habitProgress';
import { habitStartDate, isHabitDueOn } from './habitSchedule';
import type { FocusSession, Habit, HabitLog } from './models';

/** Weeks start on Sunday (common in Israel) — the key is the week's first day. */
export function weekStart(date: LocalDateString): LocalDateString {
  return addDays(date, -getWeekday(date));
}

export interface HabitWeekStat {
  habitId: string;
  title: string;
  completed: number;
  scheduled: number;
  rate: number;
}

export interface WeeklySummary {
  start: LocalDateString;
  end: LocalDateString;
  wins: HabitWeekStat[];
  toImprove: HabitWeekStat | null;
  perfectDays: number;
  focusMinutes: number;
  totalCompleted: number;
}

/** The last full week before `today` (Sunday–Saturday). */
export function previousWeek(today: LocalDateString): { start: LocalDateString; end: LocalDateString } {
  const start = addDays(weekStart(today), -7);
  return { start, end: addDays(start, 6) };
}

/**
 * A 30-second look back: up to 3 wins (best completion rate), one habit to
 * improve (lowest rate under 70%), perfect days and focus minutes.
 */
export function buildWeeklySummary(
  habits: readonly Habit[],
  logs: readonly HabitLog[],
  sessions: readonly FocusSession[],
  week: { start: LocalDateString; end: LocalDateString },
): WeeklySummary {
  const days = dateRange(week.start, week.end);
  const byKey = new Map(logs.map((l) => [`${l.habitId}|${l.logDate}`, l] as const));
  const stats: HabitWeekStat[] = [];
  const doneByDay = new Map<LocalDateString, { due: number; done: number }>();

  for (const habit of habits) {
    let scheduled = 0;
    let completed = 0;
    for (const day of days) {
      if (day < habitStartDate(habit) || !isHabitDueOn(habit, day)) continue;
      const status = progressOf(byKey.get(`${habit.id}|${day}`)).status;
      if (status === 'skipped' || status === 'forgiven') continue;
      scheduled += 1;
      const entry = doneByDay.get(day) ?? { due: 0, done: 0 };
      entry.due += 1;
      if (status === 'completed') {
        completed += 1;
        entry.done += 1;
      }
      doneByDay.set(day, entry);
    }
    if (scheduled > 0) stats.push({ habitId: habit.id, title: habit.title, completed, scheduled, rate: completed / scheduled });
  }

  const ranked = [...stats].sort((a, b) => b.rate - a.rate || b.completed - a.completed);
  const wins = ranked.filter((s) => s.completed > 0).slice(0, 3);
  const weakest = [...stats].sort((a, b) => a.rate - b.rate)[0];
  const toImprove = weakest && weakest.rate < 0.7 && !wins.slice(0, 1).some((w) => w.habitId === weakest.habitId) ? weakest : null;
  const perfectDays = [...doneByDay.values()].filter((d) => d.due > 0 && d.done === d.due).length;
  const focusMinutes = sessions
    .filter((s) => {
      const day = s.startTime.slice(0, 10);
      return day >= week.start && day <= week.end;
    })
    .reduce((sum, s) => sum + s.durationMinutes, 0);

  return {
    ...week,
    wins,
    toImprove,
    perfectDays,
    focusMinutes,
    totalCompleted: stats.reduce((sum, s) => sum + s.completed, 0),
  };
}
