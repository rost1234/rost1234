import { addDays, type LocalDateString } from '@/core/localDate';
import { makeHabit } from '@/testing/fixtures';
import type { HabitLogStatus } from '../models';
import {
  consistency,
  daysAway,
  freshStartOccasion,
  habitAgeDays,
  habitToWelcomeBack,
  showConsistency,
  sleepSummary,
} from '../motivation';

const TODAY = '2026-10-04';
const habit = makeHabit({ createdAt: '2026-08-01T08:00:00' });

function statuses(entries: [number, HabitLogStatus][]): Map<LocalDateString, HabitLogStatus> {
  return new Map(entries.map(([back, status]) => [addDays(TODAY, -back), status]));
}

describe('consistency after a break', () => {
  it('counts completed scheduled days in the last 30, not today while open', () => {
    // Done on 26 of the 29 days before today, today still open.
    const done = Array.from({ length: 29 }, (_, i) => i + 1).filter((back) => ![3, 9, 15].includes(back));
    const result = consistency(habit, statuses(done.map((back) => [back, 'completed'])), TODAY);
    expect(result).toEqual({ done: 26, due: 29 });
    expect(showConsistency(0, result)).toBe(true);
    expect(showConsistency(2, result)).toBe(true);
    expect(showConsistency(7, result)).toBe(false);
  });

  it('counts today once done, ignores skipped and paused days and days before the habit', () => {
    const young = makeHabit({ createdAt: `${addDays(TODAY, -9)}T08:00:00` });
    const result = consistency(
      young,
      statuses([
        [0, 'completed'],
        [1, 'skipped'],
        [2, 'completed'],
        [3, 'forgiven'],
      ]),
      TODAY,
      (date) => date === addDays(TODAY, -4),
    );
    // 10 days exist (today … 9 back), minus 1 skipped and 1 paused = 8 due; done = today, 2 back, the freeze.
    expect(result).toEqual({ done: 3, due: 8 });
  });

  it("isn't shown for a perfect record or with too little history", () => {
    expect(showConsistency(0, { done: 30, due: 30 })).toBe(false);
    expect(showConsistency(0, { done: 3, due: 5 })).toBe(false);
    expect(showConsistency(2, { done: 2, due: 20 })).toBe(false);
  });
});

describe('welcome back', () => {
  it('counts the days since the last use before today', () => {
    expect(daysAway(['2026-09-20', '2026-09-28', TODAY], TODAY)).toBe(6);
    expect(daysAway([TODAY], TODAY)).toBeNull();
    expect(daysAway([], TODAY)).toBeNull();
  });

  it('invites back the broken habit with the most history', () => {
    const a = makeHabit({ id: 'a' });
    const b = makeHabit({ id: 'b' });
    const c = makeHabit({ id: 'c' });
    expect(habitToWelcomeBack([a, b, c], { a: 0, b: 0, c: 4 }, { a: 3, b: 12, c: 40 })?.id).toBe('b');
    expect(habitToWelcomeBack([a], { a: 0 }, {})).toBeNull();
  });
});

describe('fresh start landmarks', () => {
  it('knows new year, the first day of Rosh Hashanah and the 1st of the month', () => {
    expect(freshStartOccasion('2027-01-01')).toBe('year');
    expect(freshStartOccasion('2026-09-12')).toBe('roshHashana');
    expect(freshStartOccasion('2026-09-13')).toBeNull();
    expect(freshStartOccasion('2026-10-01')).toBe('month');
    expect(freshStartOccasion('2026-10-04')).toBeNull();
  });
});

describe('habit age', () => {
  it('counts the creation day as day 1', () => {
    expect(habitAgeDays(makeHabit({ createdAt: `${TODAY}T08:00:00` }), TODAY)).toBe(1);
    expect(habitAgeDays(makeHabit({ createdAt: `${addDays(TODAY, -65)}T08:00:00` }), TODAY)).toBe(66);
  });
});

describe('sleep summary', () => {
  it('averages sleep and compares mood after short and enough sleep', () => {
    const nights = [
      { sleepMinutes: 300, moodScore: 2 },
      { sleepMinutes: 360, moodScore: 3 },
      { sleepMinutes: 330, moodScore: 2 },
      { sleepMinutes: 480, moodScore: 4 },
      { sleepMinutes: 450, moodScore: 5 },
      { sleepMinutes: 420, moodScore: 3 },
      { sleepMinutes: null, moodScore: 1 },
    ];
    const summary = sleepSummary(nights);
    expect(summary.nights).toBe(6);
    expect(summary.averageMinutes).toBe(390);
    expect(summary.moodAfterShort).toBeCloseTo(7 / 3);
    expect(summary.moodAfterEnough).toBe(4);
  });

  it('waits for 3 nights on each side before comparing', () => {
    const summary = sleepSummary([
      { sleepMinutes: 300, moodScore: 2 },
      { sleepMinutes: 480, moodScore: 4 },
    ]);
    expect(summary.moodAfterShort).toBeNull();
    expect(summary.moodAfterEnough).toBeNull();
    expect(sleepSummary([]).averageMinutes).toBeNull();
  });
});
