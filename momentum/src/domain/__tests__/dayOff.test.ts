import type { LocalDateString } from '@/core/localDate';
import { dayOffKind, defaultWeekendDays, type DayOffPrefs } from '../dayOff';
import { ISRAELI_HOLIDAYS, holidayOn } from '../holidays';
import type { Pause, PauseReason } from '../models';

const prefs: DayOffPrefs = { enabled: true, weekendDays: [5, 6], holidays: true };
const pause = (startDate: LocalDateString, endDate: LocalDateString, reason: PauseReason, habitId: string | null = null): Pause => ({
  id: `${startDate}-${reason}`,
  startDate,
  endDate,
  reason,
  createdAt: '2026-01-01T00:00:00.000Z',
  habitId,
});

describe('dayOffKind', () => {
  it('follows the chosen weekend days', () => {
    expect(dayOffKind('2026-10-09', prefs, [])).toEqual({ kind: 'weekend' }); // Friday
    expect(dayOffKind('2026-10-10', prefs, [])).toEqual({ kind: 'weekend' }); // Saturday
    expect(dayOffKind('2026-10-11', prefs, [])).toBeNull(); // Sunday
    expect(dayOffKind('2026-10-11', { ...prefs, weekendDays: [6, 0] }, [])).toEqual({ kind: 'weekend' });
    expect(dayOffKind('2026-10-09', { ...prefs, weekendDays: [] }, [])).toBeNull();
  });

  it('marks Israeli holidays, and holidays win over the weekend', () => {
    expect(dayOffKind('2026-09-21', prefs, [])).toEqual({ kind: 'holiday', holiday: 'yomKippur' }); // Monday
    expect(dayOffKind('2026-09-12', prefs, [])).toEqual({ kind: 'holiday', holiday: 'roshHashana' }); // Saturday
  });

  it('ignores holidays when they are turned off', () => {
    expect(dayOffKind('2026-09-21', { ...prefs, holidays: false }, [])).toBeNull();
    expect(dayOffKind('2026-09-12', { ...prefs, holidays: false }, [])).toEqual({ kind: 'weekend' });
  });

  it('an app-wide vacation pause wins over everything', () => {
    const vacation = [pause('2026-09-20', '2026-09-25', 'vacation')];
    expect(dayOffKind('2026-09-21', prefs, vacation)).toEqual({ kind: 'vacation' });
    expect(dayOffKind('2026-09-22', prefs, vacation)).toEqual({ kind: 'vacation' });
    expect(dayOffKind('2026-09-27', prefs, vacation)).toBeNull();
  });

  it('a sick pause or a single-habit pause is not a day off', () => {
    expect(dayOffKind('2026-09-22', prefs, [pause('2026-09-20', '2026-09-25', 'sick')])).toBeNull();
    expect(dayOffKind('2026-09-22', prefs, [pause('2026-09-20', '2026-09-25', 'vacation', 'habit-1')])).toBeNull();
  });

  it('is always null when the mode is off', () => {
    const off = { ...prefs, enabled: false };
    expect(dayOffKind('2026-10-09', off, [])).toBeNull();
    expect(dayOffKind('2026-09-21', off, [])).toBeNull();
    expect(dayOffKind('2026-09-22', off, [pause('2026-09-20', '2026-09-25', 'vacation')])).toBeNull();
  });

  it('defaults to Fri–Sat in Hebrew and Sat–Sun in English', () => {
    expect(defaultWeekendDays('he')).toEqual([5, 6]);
    expect(defaultWeekendDays('en')).toEqual([6, 0]);
  });
});

describe('ISRAELI_HOLIDAYS', () => {
  it('pins known dates', () => {
    expect(holidayOn('2026-09-12')).toBe('roshHashana');
    expect(holidayOn('2026-09-13')).toBe('roshHashana');
    expect(holidayOn('2026-09-21')).toBe('yomKippur');
    expect(holidayOn('2027-04-22')).toBe('pesach');
    expect(holidayOn('2026-04-22')).toBe('independence');
    expect(holidayOn('2026-09-30')).toBeNull();
  });

  it('matches the Hebrew calendar in Intl', () => {
    const fmt = new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric', month: 'long', timeZone: 'UTC' });
    if (!fmt.resolvedOptions().calendar.includes('hebrew')) return; // No full ICU in this Node build.
    const fixed: Record<string, Record<number, string>> = {
      Tishri: { 1: 'roshHashana', 2: 'roshHashana', 10: 'yomKippur', 15: 'sukkot', 22: 'simchatTorah' },
      Nisan: { 15: 'pesach', 21: 'pesach7' },
      Sivan: { 6: 'shavuot' },
    };
    const expected: Record<string, string> = {};
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    for (let d = new Date(Date.UTC(2026, 0, 1)); d.getTime() < Date.UTC(2036, 0, 1); d = new Date(d.getTime() + 864e5)) {
      const parts = Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]));
      const day = Number(parts.day);
      const key = parts.month ? fixed[parts.month]?.[day] : undefined;
      if (key) expected[iso(d)] = key;
      if (parts.month === 'Iyar' && day === 5) {
        const weekday = d.getUTCDay();
        const shift = weekday === 5 ? -1 : weekday === 6 ? -2 : weekday === 1 ? 1 : 0;
        expected[iso(new Date(d.getTime() + shift * 864e5))] = 'independence';
      }
    }
    expect(ISRAELI_HOLIDAYS).toEqual(expected);
  });
});
