import { formatDuration, formatMinutesOfDay, splitByLocalDay, stepMinutesOfDay, summarizeUsage } from '../usage';

describe('usage', () => {
  it('splits a session that crosses local midnight', () => {
    const start = new Date(2026, 8, 24, 23, 59, 30).getTime();
    const end = new Date(2026, 8, 25, 0, 1, 0).getTime();
    expect(splitByLocalDay(start, end)).toEqual([
      { logDate: '2026-09-24', seconds: 30 },
      { logDate: '2026-09-25', seconds: 60 },
    ]);
    expect(splitByLocalDay(end, start)).toEqual([]);
  });

  it('summarizes against the 5-minute goal', () => {
    const summary = summarizeUsage(
      [
        { logDate: '2026-09-22', seconds: 400 },
        { logDate: '2026-09-23', seconds: 200 },
        { logDate: '2026-09-24', seconds: 120 },
      ],
      '2026-09-24',
    );
    expect(summary).toEqual({ todaySeconds: 120, averageSeconds: 240, daysOverGoal: 1, daysTracked: 3 });
    expect(summarizeUsage([], '2026-09-24').averageSeconds).toBeNull();
  });

  it('formats durations and reminder times', () => {
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(185)).toBe('3m 05s');
    expect(formatDuration(3720)).toBe('1h 02m');
    expect(formatMinutesOfDay(1260)).toBe('21:00');
    expect(stepMinutesOfDay(1430, 15)).toBe(5);
    expect(stepMinutesOfDay(5, -15)).toBe(1430);
  });
});
