import { addDays, type LocalDateString } from '@/core/localDate';
import { ISRAELI_HOLIDAYS } from './holidays';
import { habitStartDate, isHabitDueOn } from './habitSchedule';
import type { Habit, HabitLogStatus } from './models';

type StatusByDate = ReadonlyMap<LocalDateString, HabitLogStatus>;
type ScheduledHabit = Pick<Habit, 'createdAt' | 'targetFrequency' | 'targetDays'>;

/** Days a habit is measured over after a break ("26 of 30"). */
export const CONSISTENCY_WINDOW = 30;
/** The consistency line shows until the new streak reaches this. */
export const CONSISTENCY_UNTIL_STREAK = 7;
/** Away this many days → "welcome back" instead of a pile of decisions. */
export const WELCOME_BACK_DAYS = 5;
/** Median days until a habit felt automatic (Lally et al. 2010). */
export const AUTOMATIC_DAY = 66;

/**
 * How many of the habit's scheduled days in the last 30 were completed. Today
 * counts only once done (an open day isn't a miss); paused and skipped days,
 * and days before the habit existed, don't count either way.
 */
export function consistency(
  habit: ScheduledHabit,
  statuses: StatusByDate,
  today: LocalDateString,
  isPausedOn: (date: LocalDateString) => boolean = () => false,
): { done: number; due: number } {
  const start = habitStartDate(habit);
  let done = 0;
  let due = 0;
  for (let i = 0; i < CONSISTENCY_WINDOW; i += 1) {
    const date = addDays(today, -i);
    if (date < start) break;
    if (!isHabitDueOn(habit, date) || isPausedOn(date)) continue;
    const status = statuses.get(date);
    if (status === 'skipped') continue;
    if (date === today && status !== 'completed') continue;
    due += 1;
    if (status === 'completed' || status === 'forgiven') done += 1;
  }
  return { done, due };
}

/**
 * After a break, the whole picture ("26 of 30") instead of a lone small streak.
 * Shown only while the new streak is young, and only when there's more to
 * count than the streak itself (i.e. the habit really had an earlier run).
 */
export function showConsistency(streak: number, result: { done: number; due: number }): boolean {
  return streak < CONSISTENCY_UNTIL_STREAK && result.due >= 7 && result.done > streak && result.done < result.due;
}

/** Days since the app was last used before today, or null when it's the first use. */
export function daysAway(usedDates: readonly LocalDateString[], today: LocalDateString): number | null {
  const before = usedDates.filter((date) => date < today).sort();
  const last = before[before.length - 1];
  if (!last) return null;
  let days = 0;
  for (let cursor = last; cursor < today && days < 1000; cursor = addDays(cursor, 1)) days += 1;
  return days;
}

export type FreshStartOccasion = 'year' | 'roshHashana' | 'month';

/** Temporal landmarks that make a fresh start feel natural (Dai, Milkman & Riis 2014). */
export function freshStartOccasion(date: LocalDateString): FreshStartOccasion | null {
  if (date.endsWith('-01-01')) return 'year';
  // The first day of Rosh Hashanah (the table lists both days).
  if (ISRAELI_HOLIDAYS[date] === 'roshHashana' && ISRAELI_HOLIDAYS[addDays(date, -1)] !== 'roshHashana') return 'roshHashana';
  if (date.endsWith('-01')) return 'month';
  return null;
}

/** Whole days between the habit's start and `today` (day 1 = the day it was created). */
export function habitAgeDays(habit: Pick<Habit, 'createdAt'>, today: LocalDateString): number {
  const start = habitStartDate(habit);
  if (start > today) return 0;
  let days = 1;
  for (let cursor = start; cursor < today && days < 100000; cursor = addDays(cursor, 1)) days += 1;
  return days;
}

/** The habit that's had a break and was completed before — the one to invite back. */
export function habitToWelcomeBack<T extends Pick<Habit, 'id' | 'isArchived'> & Partial<Pick<Habit, 'isQuit'>>>(
  habits: readonly T[],
  streaks: Readonly<Record<string, number>>,
  completedBefore: Readonly<Record<string, number>>,
): T | null {
  // A habit to quit isn't something to "start again with a small step".
  const candidates = habits.filter((h) => !h.isArchived && !h.isQuit && (streaks[h.id] ?? 0) === 0 && (completedBefore[h.id] ?? 0) > 0);
  return [...candidates].sort((a, b) => (completedBefore[b.id] ?? 0) - (completedBefore[a.id] ?? 0))[0] ?? null;
}

/** Below this many hours a night counts as short (adults need 7+; Watson et al. 2015). */
export const SHORT_SLEEP_HOURS = 7;

export interface SleepSummary {
  nights: number;
  averageMinutes: number | null;
  /** Average mood (1–5) after short vs. enough sleep; null until each has 3+ nights. */
  moodAfterShort: number | null;
  moodAfterEnough: number | null;
}

/** Sleep from the evening reflections, and how mood looked on short vs. enough sleep. */
export function sleepSummary(reflections: readonly { sleepMinutes: number | null; moodScore: number }[]): SleepSummary {
  const withSleep = reflections.filter((r): r is { sleepMinutes: number; moodScore: number } => typeof r.sleepMinutes === 'number' && r.sleepMinutes > 0);
  const average = (values: number[]) => (values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null);
  const short = withSleep.filter((r) => r.sleepMinutes < SHORT_SLEEP_HOURS * 60).map((r) => r.moodScore);
  const enough = withSleep.filter((r) => r.sleepMinutes >= SHORT_SLEEP_HOURS * 60).map((r) => r.moodScore);
  return {
    nights: withSleep.length,
    averageMinutes: average(withSleep.map((r) => r.sleepMinutes)),
    moodAfterShort: short.length >= 3 ? average(short) : null,
    moodAfterEnough: enough.length >= 3 ? average(enough) : null,
  };
}
