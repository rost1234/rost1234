import type { LocalDateString } from '@/core/localDate';
import { SHORT_SLEEP_HOURS } from './motivation';
import type { UrgeLog, UrgeMode, UrgeTrigger } from './models';

/** How long each way of riding out an urge lasts (urges rise, peak and fade within minutes). */
export const URGE_MINUTES: Readonly<Record<UrgeMode, number>> = { sit: 10, walk: 5 };

export const URGE_TRIGGERS: readonly UrgeTrigger[] = ['tired', 'stress', 'bored', 'meal', 'people', 'other'];

/** The trigger map shows only after this many logged urges, so a few entries don't read as a pattern. */
export const TRIGGER_MAP_MIN = 10;

/** Nights of each kind (short / enough sleep) needed before comparing them. */
const SLEEP_MIN_NIGHTS = 3;

export type PartOfDay = 'morning' | 'afternoon' | 'evening' | 'night';
export const PARTS_OF_DAY: readonly PartOfDay[] = ['morning', 'afternoon', 'evening', 'night'];

/** 05–12 morning, 12–17 afternoon, 17–22 evening, 22–05 night (local time). */
export function partOfDay(hour: number): PartOfDay {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

/** Urges on this habit that passed this calendar month (`today`'s month), including today. */
export function passedThisMonth(logs: readonly UrgeLog[], habitId: string, today: LocalDateString): number {
  const month = today.slice(0, 7);
  return logs.filter((l) => l.habitId === habitId && l.outcome === 'passed' && l.logDate.startsWith(month) && l.logDate <= today).length;
}

export interface QuitSavings {
  money: number | null;
  minutes: number | null;
}

/** What the clean days saved, from the user's own per-day estimate. Null when nothing to show. */
export function quitSavings(cleanDays: number, costPerDay: number | null, minutesPerDay: number | null): QuitSavings | null {
  if (cleanDays <= 0) return null;
  const money = costPerDay && costPerDay > 0 ? cleanDays * costPerDay : null;
  const minutes = minutesPerDay && minutesPerDay > 0 ? cleanDays * minutesPerDay : null;
  return money === null && minutes === null ? null : { money, minutes };
}

/** Saved time for display: minutes under an hour, else whole hours. */
export function savedTime(minutes: number): { unit: 'minutes' | 'hours'; value: number } {
  return minutes < 60 ? { unit: 'minutes', value: minutes } : { unit: 'hours', value: Math.round(minutes / 60) };
}

export interface TriggerMap {
  total: number;
  passed: number;
  byPart: Record<PartOfDay, number>;
  /** Tagged triggers, most common first. */
  triggers: { trigger: UrgeTrigger; count: number }[];
  /** Urges a day after short vs. enough sleep; null until each has enough nights. */
  sleep: { short: number; enough: number } | null;
}

/**
 * When urges come and what brings them, from the "urge now" log. Sleep is the
 * evening reflection's hours (the night before that day); only days on or after
 * the first logged urge count, so days before the habit was tracked don't dilute it.
 */
export function triggerMap(
  logs: readonly Pick<UrgeLog, 'startedAt' | 'logDate' | 'outcome' | 'trigger'>[],
  reflections: readonly { logDate: LocalDateString; sleepMinutes: number | null }[],
  hourOf: (iso: string) => number = (iso) => new Date(iso).getHours(),
): TriggerMap {
  const byPart: Record<PartOfDay, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  const tagCounts = new Map<UrgeTrigger, number>();
  const perDay = new Map<LocalDateString, number>();
  for (const log of logs) {
    byPart[partOfDay(hourOf(log.startedAt))] += 1;
    if (log.trigger) tagCounts.set(log.trigger, (tagCounts.get(log.trigger) ?? 0) + 1);
    perDay.set(log.logDate, (perDay.get(log.logDate) ?? 0) + 1);
  }
  const triggers = [...tagCounts.entries()]
    .map(([trigger, count]) => ({ trigger, count }))
    .sort((a, b) => b.count - a.count || URGE_TRIGGERS.indexOf(a.trigger) - URGE_TRIGGERS.indexOf(b.trigger));

  const first = logs.reduce<LocalDateString | null>((min, l) => (min === null || l.logDate < min ? l.logDate : min), null);
  const short: number[] = [];
  const enough: number[] = [];
  for (const r of reflections) {
    if (!first || r.logDate < first || !r.sleepMinutes || r.sleepMinutes <= 0) continue;
    (r.sleepMinutes < SHORT_SLEEP_HOURS * 60 ? short : enough).push(perDay.get(r.logDate) ?? 0);
  }
  const avg = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
  const sleep = short.length >= SLEEP_MIN_NIGHTS && enough.length >= SLEEP_MIN_NIGHTS ? { short: avg(short), enough: avg(enough) } : null;

  return { total: logs.length, passed: logs.filter((l) => l.outcome === 'passed').length, byPart, triggers, sleep };
}
