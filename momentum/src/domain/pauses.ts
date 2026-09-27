import { addDays, dateRange, type LocalDateString } from '@/core/localDate';
import type { HabitLogStatus, Pause } from './models';
import type { StatusByDate } from './streaks';

export function isPaused(pauses: readonly Pause[], date: LocalDateString): boolean {
  return pauses.some((p) => date >= p.startDate && date <= p.endDate);
}

export type EndPauseChange = { kind: 'delete' } | { kind: 'shorten'; endDate: LocalDateString } | { kind: 'none' };

/**
 * Ending a pause early must not rewrite the past: days already paused stay
 * paused (otherwise they turn into misses and can break streaks or spend
 * freezes). Only a pause that hasn't started yet is removed outright.
 */
export function endPauseChange(pause: Pause, today: LocalDateString): EndPauseChange {
  if (pause.startDate >= today) return { kind: 'delete' };
  if (pause.endDate < today) return { kind: 'none' };
  return { kind: 'shorten', endDate: addDays(today, -1) };
}

/** Inclusive length of a date range in days. */
export function pauseLength(startDate: LocalDateString, endDate: LocalDateString): number {
  return dateRange(startDate, endDate).length;
}

/** The pause covering `date`, if any (for the "vacation mode" banner). */
export function activePause(pauses: readonly Pause[], date: LocalDateString): Pause | null {
  return pauses.find((p) => date >= p.startDate && date <= p.endDate) ?? null;
}

/**
 * Treats paused days as "skipped" unless something was actually done, which
 * reuses the streak engine's bridging rule: streaks neither break nor grow and
 * no freezes are spent. Only dates up to `until` are touched.
 */
export function applyPauses(statuses: StatusByDate, pauses: readonly Pause[], until: LocalDateString): Map<LocalDateString, HabitLogStatus> {
  const result = new Map(statuses);
  for (const pause of pauses) {
    if (pause.startDate > until) continue;
    const end = pause.endDate < until ? pause.endDate : until;
    for (const date of dateRange(pause.startDate, end)) {
      const status = result.get(date);
      if (status !== 'completed' && status !== 'forgiven') result.set(date, 'skipped');
    }
  }
  return result;
}

/** Same as `applyPauses`, for every habit's status map. */
export function applyPausesToAll(
  byHabit: ReadonlyMap<string, StatusByDate>,
  habitIds: readonly string[],
  pauses: readonly Pause[],
  until: LocalDateString,
): Map<string, Map<LocalDateString, HabitLogStatus>> {
  const result = new Map<string, Map<LocalDateString, HabitLogStatus>>();
  for (const id of habitIds) {
    result.set(id, applyPauses(byHabit.get(id) ?? new Map(), pauses, until));
  }
  return result;
}
