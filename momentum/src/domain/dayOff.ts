import { getWeekday, type LocalDateString, type Weekday } from '@/core/localDate';
import { holidayOn, type HolidayKey } from './holidays';
import type { Pause } from './models';
import { activePause } from './pauses';

export type DayOff = { kind: 'vacation' } | { kind: 'holiday'; holiday: HolidayKey } | { kind: 'weekend' };

export interface DayOffPrefs {
  enabled: boolean;
  weekendDays: readonly Weekday[];
  holidays: boolean;
}

/** Fri–Sat in Israel, Sat–Sun elsewhere. */
export function defaultWeekendDays(language: 'he' | 'en'): Weekday[] {
  return language === 'he' ? [5, 6] : [6, 0];
}

/**
 * Is `date` a day off, and which kind? An app-wide vacation pause wins, then an
 * Israeli holiday, then the weekend. A sick or "other" pause, or a pause on a
 * single habit, isn't a day off.
 */
export function dayOffKind(date: LocalDateString, prefs: DayOffPrefs, pauses: readonly Pause[]): DayOff | null {
  if (!prefs.enabled) return null;
  if (activePause(pauses, date)?.reason === 'vacation') return { kind: 'vacation' };
  const holiday = prefs.holidays ? holidayOn(date) : null;
  if (holiday) return { kind: 'holiday', holiday };
  return prefs.weekendDays.includes(getWeekday(date)) ? { kind: 'weekend' } : null;
}
