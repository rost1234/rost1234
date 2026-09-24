import { dateRange, type LocalDateString } from '@/core/localDate';
import type { HabitLogStatus, Pause } from './models';
import type { StatusByDate } from './streaks';

export function isPaused(pauses: readonly Pause[], date: LocalDateString): boolean {
  return pauses.some((p) => date >= p.startDate && date <= p.endDate);
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
