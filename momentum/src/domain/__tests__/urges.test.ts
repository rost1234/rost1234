import type { UrgeLog } from '../models';
import { partOfDay, passedThisMonth, quitSavings, savedTime, TRIGGER_MAP_MIN, triggerMap } from '../urges';

const urge = (over: Partial<UrgeLog>): UrgeLog => ({
  id: 'u',
  habitId: 'smoke',
  startedAt: '2026-10-06T20:00:00',
  logDate: '2026-10-06',
  outcome: 'passed',
  trigger: null,
  mode: 'sit',
  ...over,
});

const hourOf = (iso: string) => Number(iso.slice(11, 13));

describe('partOfDay', () => {
  it('splits the day into four parts', () => {
    expect(partOfDay(4)).toBe('night');
    expect(partOfDay(5)).toBe('morning');
    expect(partOfDay(12)).toBe('afternoon');
    expect(partOfDay(17)).toBe('evening');
    expect(partOfDay(22)).toBe('night');
  });
});

describe('passedThisMonth', () => {
  it('counts only passed urges of this habit in this month', () => {
    const logs = [
      urge({ logDate: '2026-10-01' }),
      urge({ logDate: '2026-10-06' }),
      urge({ logDate: '2026-10-06', outcome: 'slipped' }),
      urge({ logDate: '2026-09-30' }),
      urge({ logDate: '2026-10-02', habitId: 'other' }),
    ];
    expect(passedThisMonth(logs, 'smoke', '2026-10-06')).toBe(2);
  });
});

describe('quitSavings', () => {
  it('multiplies clean days by the per-day estimate', () => {
    expect(quitSavings(12, 37, 30)).toEqual({ money: 444, minutes: 360 });
    expect(quitSavings(12, 37, null)).toEqual({ money: 444, minutes: null });
  });
  it('is null with no clean days or no estimate', () => {
    expect(quitSavings(0, 37, 30)).toBeNull();
    expect(quitSavings(5, null, null)).toBeNull();
  });
  it('shows minutes under an hour, else hours', () => {
    expect(savedTime(45)).toEqual({ unit: 'minutes', value: 45 });
    expect(savedTime(360)).toEqual({ unit: 'hours', value: 6 });
  });
});

describe('triggerMap', () => {
  it('counts urges by part of day and trigger', () => {
    const map = triggerMap(
      [
        urge({ startedAt: '2026-10-01T08:00:00', trigger: 'meal' }),
        urge({ startedAt: '2026-10-01T20:00:00', trigger: 'tired' }),
        urge({ startedAt: '2026-10-02T21:00:00', trigger: 'tired', outcome: 'slipped' }),
      ],
      [],
      hourOf,
    );
    expect(map.total).toBe(3);
    expect(map.passed).toBe(2);
    expect(map.byPart).toEqual({ morning: 1, afternoon: 0, evening: 2, night: 0 });
    expect(map.triggers).toEqual([
      { trigger: 'tired', count: 2 },
      { trigger: 'meal', count: 1 },
    ]);
    expect(map.sleep).toBeNull();
  });

  it('compares urges a day after short vs. enough sleep once each has 3 nights', () => {
    const logs = [
      urge({ logDate: '2026-10-01' }),
      urge({ logDate: '2026-10-01' }),
      urge({ logDate: '2026-10-02' }),
      urge({ logDate: '2026-10-04' }),
    ];
    const reflections = [
      { logDate: '2026-09-20', sleepMinutes: 300 }, // before the first urge: ignored
      { logDate: '2026-10-01', sleepMinutes: 360 },
      { logDate: '2026-10-02', sleepMinutes: 330 },
      { logDate: '2026-10-03', sleepMinutes: 300 },
      { logDate: '2026-10-04', sleepMinutes: 480 },
      { logDate: '2026-10-05', sleepMinutes: 450 },
      { logDate: '2026-10-06', sleepMinutes: 420 },
    ];
    const map = triggerMap(logs, reflections, hourOf);
    expect(map.sleep).toEqual({ short: 1, enough: 1 / 3 });
    expect(triggerMap(logs, reflections.slice(0, 6), hourOf).sleep).toBeNull();
  });

  it('needs a minimum before it is shown', () => {
    expect(TRIGGER_MAP_MIN).toBe(10);
  });
});
