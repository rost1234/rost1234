import type { LocalDateString } from '@/core/localDate';

export type HolidayKey = 'roshHashana' | 'yomKippur' | 'sukkot' | 'simchatTorah' | 'pesach' | 'pesach7' | 'shavuot' | 'independence';

/**
 * Israeli days off, 2026–2035. Generated once from the Hebrew calendar in Node's
 * Intl (the phone's JS engine may not have it) and checked against it by
 * `__tests__/holidays.test.ts`. Yom Ha'atzmaut includes the official shift when
 * 5 Iyar falls on a Friday, Saturday or Monday.
 */
export const ISRAELI_HOLIDAYS: Readonly<Record<LocalDateString, HolidayKey>> = {
  '2026-04-02': 'pesach', '2026-04-08': 'pesach7', '2026-04-22': 'independence', '2026-05-22': 'shavuot', '2026-09-12': 'roshHashana', '2026-09-13': 'roshHashana', '2026-09-21': 'yomKippur', '2026-09-26': 'sukkot', '2026-10-03': 'simchatTorah',
  '2027-04-22': 'pesach', '2027-04-28': 'pesach7', '2027-05-12': 'independence', '2027-06-11': 'shavuot', '2027-10-02': 'roshHashana', '2027-10-03': 'roshHashana', '2027-10-11': 'yomKippur', '2027-10-16': 'sukkot', '2027-10-23': 'simchatTorah',
  '2028-04-11': 'pesach', '2028-04-17': 'pesach7', '2028-05-02': 'independence', '2028-05-31': 'shavuot', '2028-09-21': 'roshHashana', '2028-09-22': 'roshHashana', '2028-09-30': 'yomKippur', '2028-10-05': 'sukkot', '2028-10-12': 'simchatTorah',
  '2029-03-31': 'pesach', '2029-04-06': 'pesach7', '2029-04-19': 'independence', '2029-05-20': 'shavuot', '2029-09-10': 'roshHashana', '2029-09-11': 'roshHashana', '2029-09-19': 'yomKippur', '2029-09-24': 'sukkot', '2029-10-01': 'simchatTorah',
  '2030-04-18': 'pesach', '2030-04-24': 'pesach7', '2030-05-08': 'independence', '2030-06-07': 'shavuot', '2030-09-28': 'roshHashana', '2030-09-29': 'roshHashana', '2030-10-07': 'yomKippur', '2030-10-12': 'sukkot', '2030-10-19': 'simchatTorah',
  '2031-04-08': 'pesach', '2031-04-14': 'pesach7', '2031-04-29': 'independence', '2031-05-28': 'shavuot', '2031-09-18': 'roshHashana', '2031-09-19': 'roshHashana', '2031-09-27': 'yomKippur', '2031-10-02': 'sukkot', '2031-10-09': 'simchatTorah',
  '2032-03-27': 'pesach', '2032-04-02': 'pesach7', '2032-04-15': 'independence', '2032-05-16': 'shavuot', '2032-09-06': 'roshHashana', '2032-09-07': 'roshHashana', '2032-09-15': 'yomKippur', '2032-09-20': 'sukkot', '2032-09-27': 'simchatTorah',
  '2033-04-14': 'pesach', '2033-04-20': 'pesach7', '2033-05-04': 'independence', '2033-06-03': 'shavuot', '2033-09-24': 'roshHashana', '2033-09-25': 'roshHashana', '2033-10-03': 'yomKippur', '2033-10-08': 'sukkot', '2033-10-15': 'simchatTorah',
  '2034-04-04': 'pesach', '2034-04-10': 'pesach7', '2034-04-25': 'independence', '2034-05-24': 'shavuot', '2034-09-14': 'roshHashana', '2034-09-15': 'roshHashana', '2034-09-23': 'yomKippur', '2034-09-28': 'sukkot', '2034-10-05': 'simchatTorah',
  '2035-04-24': 'pesach', '2035-04-30': 'pesach7', '2035-05-15': 'independence', '2035-06-13': 'shavuot', '2035-10-04': 'roshHashana', '2035-10-05': 'roshHashana', '2035-10-13': 'yomKippur', '2035-10-18': 'sukkot', '2035-10-25': 'simchatTorah',
};

export function holidayOn(date: LocalDateString): HolidayKey | null {
  return ISRAELI_HOLIDAYS[date] ?? null;
}
