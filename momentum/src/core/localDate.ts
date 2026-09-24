/**
 * Local-date engine. Every log in Momentum is keyed by the user's *local*
 * calendar date (YYYY-MM-DD) — never by UTC — so a habit done at 23:30 counts
 * for the day the user actually experienced.
 */

/** A calendar date string in the form YYYY-MM-DD (local device time). */
export type LocalDateString = string;

/** 0 = Sunday … 6 = Saturday (matches `Date#getDay`). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const pad2 = (value: number): string => (value < 10 ? `0${value}` : String(value));

/** Formats a Date using its local-time components. */
export function formatLocalDate(date: Date): LocalDateString {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Returns today's date on the device clock as YYYY-MM-DD. */
export function getLocalDeviceDate(now: Date = new Date()): LocalDateString {
  return formatLocalDate(now);
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isLocalDateString(value: string): value is LocalDateString {
  return DATE_PATTERN.test(value);
}

/** Parses YYYY-MM-DD into a Date at local noon (noon avoids DST edge cases). */
export function parseLocalDate(value: LocalDateString): Date {
  const match = DATE_PATTERN.exec(value);
  if (!match) {
    throw new Error(`Invalid local date: "${value}"`);
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
}

export function addDays(value: LocalDateString, days: number): LocalDateString {
  const date = parseLocalDate(value);
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

export function getWeekday(value: LocalDateString): Weekday {
  return parseLocalDate(value).getDay() as Weekday;
}

/** Inclusive list of dates from `start` to `end` (ascending). */
export function dateRange(start: LocalDateString, end: LocalDateString): LocalDateString[] {
  const result: LocalDateString[] = [];
  let cursor = start;
  while (cursor <= end) {
    result.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return result;
}

/** The `count` most recent days ending at `end` (ascending). */
export function lastNDays(end: LocalDateString, count: number): LocalDateString[] {
  return dateRange(addDays(end, -(count - 1)), end);
}

/** Milliseconds until the next local midnight. */
export function msUntilNextLocalMidnight(now: Date = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return next.getTime() - now.getTime();
}

/** Extracts the local date from an ISO timestamp. */
export function localDateFromIso(iso: string): LocalDateString {
  return formatLocalDate(new Date(iso));
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

/** Locale-aware formatting with an English fallback if Intl is unavailable. */
function intlFormat(date: Date, locale: string, options: Intl.DateTimeFormatOptions): string | null {
  try {
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch {
    return null;
  }
}

/** Short weekday name, e.g. "Mon" / "ב׳". 2026-09-20 is a Sunday. */
export function weekdayLabel(day: Weekday, locale = 'en-US'): string {
  const reference = new Date(2026, 8, 20 + day, 12);
  return intlFormat(reference, locale, { weekday: 'short' }) ?? WEEKDAY_SHORT[day];
}

/** e.g. "Thu, Sep 24" / "יום ה׳, 24 בספט׳" */
export function formatFriendlyDate(value: LocalDateString, locale = 'en-US'): string {
  const date = parseLocalDate(value);
  return (
    intlFormat(date, locale, { weekday: 'short', month: 'short', day: 'numeric' }) ??
    `${WEEKDAY_SHORT[date.getDay()]}, ${MONTH_SHORT[date.getMonth()]} ${date.getDate()}`
  );
}
