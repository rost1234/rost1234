import { formatLocalDate, type LocalDateString } from '@/core/localDate';
import type { DailyUsage } from './models';

/** The app's promise to the user: under 5 minutes of screen time a day. */
export const DAILY_USAGE_GOAL_SECONDS = 5 * 60;

/** A single foreground stretch longer than this is treated as "left open" and capped. */
export const MAX_SESSION_SECONDS = 30 * 60;

/**
 * Splits a foreground interval into per-local-day seconds, so time spent
 * across midnight is attributed to both days.
 */
export function splitByLocalDay(startMs: number, endMs: number): DailyUsage[] {
  if (!(endMs > startMs)) return [];
  const result: DailyUsage[] = [];
  let cursor = startMs;
  while (cursor < endMs) {
    const day = new Date(cursor);
    const nextMidnight = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1).getTime();
    const sliceEnd = Math.min(endMs, nextMidnight);
    result.push({ logDate: formatLocalDate(day), seconds: (sliceEnd - cursor) / 1000 });
    cursor = sliceEnd;
  }
  return result;
}

export interface UsageSummary {
  todaySeconds: number;
  /** Average over days the app was actually opened in the window, or null. */
  averageSeconds: number | null;
  daysOverGoal: number;
  daysTracked: number;
}

export function summarizeUsage(usage: readonly DailyUsage[], today: LocalDateString): UsageSummary {
  const tracked = usage.filter((u) => u.seconds > 0);
  const total = tracked.reduce((sum, u) => sum + u.seconds, 0);
  return {
    todaySeconds: usage.find((u) => u.logDate === today)?.seconds ?? 0,
    averageSeconds: tracked.length > 0 ? total / tracked.length : null,
    daysOverGoal: tracked.filter((u) => u.seconds > DAILY_USAGE_GOAL_SECONDS).length,
    daysTracked: tracked.length,
  };
}

/** "3m 05s", "45s", "1h 02m". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return `${s}s`;
  const minutes = Math.floor(s / 60);
  if (minutes < 60) return `${minutes}m ${String(s % 60).padStart(2, '0')}s`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}

/** Minutes after midnight → "21:00". */
export function formatMinutesOfDay(minutes: number): string {
  const m = ((Math.trunc(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** Steps a time of day by `delta` minutes, wrapping around midnight. */
export function stepMinutesOfDay(minutes: number, delta: number): number {
  return (((minutes + delta) % 1440) + 1440) % 1440;
}
