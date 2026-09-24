import { addDays, dateRange, getLocalDeviceDate, getWeekday, lastNDays, msUntilNextLocalMidnight } from '@/core/localDate';

describe('localDate', () => {
  it('formats the local device date as YYYY-MM-DD', () => {
    expect(getLocalDeviceDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(getLocalDeviceDate(new Date(2026, 11, 31, 0, 0))).toBe('2026-12-31');
  });

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('builds inclusive ranges', () => {
    expect(dateRange('2026-09-29', '2026-10-02')).toEqual(['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']);
    expect(lastNDays('2026-09-24', 3)).toEqual(['2026-09-22', '2026-09-23', '2026-09-24']);
  });

  it('computes weekday and time until midnight', () => {
    expect(getWeekday('2026-09-24')).toBe(4); // Thursday
    expect(msUntilNextLocalMidnight(new Date(2026, 8, 24, 23, 59, 0))).toBe(60_000);
  });
});
