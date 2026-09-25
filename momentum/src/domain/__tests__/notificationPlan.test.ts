import { addDays, type LocalDateString } from '@/core/localDate';
import { makeHabit } from '@/testing/fixtures';
import type { HabitLog, HabitLogStatus } from '../models';
import {
  DEFAULT_NOTIFICATION_PREFS,
  fitQuietHours,
  isReminderIgnored,
  planNotifications,
  type PlanInput,
} from '../notificationPlan';
import { usualReminderMinutes } from '../rhythm';

const TODAY = '2026-09-24'; // Thursday

function log(habitId: string, logDate: LocalDateString, status: HabitLogStatus, hour = 8, minute = 0): HabitLog {
  const [y, m, d] = logDate.split('-').map(Number) as [number, number, number];
  return { id: `${habitId}-${logDate}`, habitId, logDate, currentCount: 1, status, updatedAt: new Date(y, m - 1, d, hour, minute).toISOString() };
}

function index(logs: HabitLog[]): PlanInput['logsByHabit'] {
  const result: Record<string, Record<LocalDateString, HabitLog>> = {};
  for (const l of logs) (result[l.habitId] ??= {})[l.logDate] = l;
  return result;
}

function input(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    today: TODAY,
    nowMinutes: 6 * 60,
    habits: [],
    logsByHabit: {},
    streaks: {},
    pauses: [],
    prefs: { ...DEFAULT_NOTIFICATION_PREFS, streakRescue: false },
    reflectionMinutes: null,
    reflectedToday: false,
    ...overrides,
  };
}

describe('fitQuietHours', () => {
  it('moves a time out of the quiet window to the nearer edge', () => {
    expect(fitQuietHours(23 * 60, 22 * 60, 7 * 60)).toBe(21 * 60 + 45);
    expect(fitQuietHours(6 * 60, 22 * 60, 7 * 60)).toBe(7 * 60);
    expect(fitQuietHours(12 * 60, 22 * 60, 7 * 60)).toBe(12 * 60);
    expect(fitQuietHours(14 * 60, 13 * 60, 16 * 60)).toBe(12 * 60 + 45);
    expect(fitQuietHours(15 * 60 + 30, 13 * 60, 16 * 60)).toBe(16 * 60);
    expect(fitQuietHours(3 * 60, 0, 0)).toBe(3 * 60);
  });
});

describe('usualReminderMinutes by weekday', () => {
  it('prefers the same weekday when there are 3+ completions on it', () => {
    // Saturdays at 10:00, other days at 07:00.
    const saturdays = ['2026-09-05', '2026-09-12', '2026-09-19'].map((d) => log('h', d, 'completed', 10));
    const weekdays = ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18'].map((d) => log('h', d, 'completed', 7));
    const logs = [...saturdays, ...weekdays].sort((a, b) => a.logDate.localeCompare(b.logDate));
    expect(usualReminderMinutes(makeHabit(), logs, 6)).toBe(9 * 60 + 45);
    expect(usualReminderMinutes(makeHabit(), logs, 1)).toBe(6 * 60 + 45);
  });
});

describe('isReminderIgnored', () => {
  const habit = makeHabit({ id: 'h', createdAt: '2026-08-01T08:00:00' });
  it('is true after a week with at most one completion, false otherwise', () => {
    const one = index([log('h', addDays(TODAY, -2), 'completed')]);
    expect(isReminderIgnored(habit, one.h ?? {}, [], TODAY)).toBe(true);
    const two = index([log('h', addDays(TODAY, -2), 'completed'), log('h', addDays(TODAY, -5), 'completed')]);
    expect(isReminderIgnored(habit, two.h ?? {}, [], TODAY)).toBe(false);
  });
  it('needs a full week of history and ignores paused days', () => {
    expect(isReminderIgnored(makeHabit({ createdAt: '2026-09-21T08:00:00' }), {}, [], TODAY)).toBe(false);
    const pause = { id: 'p', startDate: addDays(TODAY, -30), endDate: addDays(TODAY, -1), reason: 'vacation' as const, createdAt: 'x' };
    expect(isReminderIgnored(habit, {}, [pause], TODAY)).toBe(false);
  });
});

describe('planNotifications', () => {
  const water = makeHabit({ id: 'water', title: 'Water', reminder: 'smart', timeOfDay: 'morning', createdAt: '2026-09-20T08:00:00' });
  const stretch = makeHabit({ id: 'stretch', title: 'Stretch', reminder: 'smart', timeOfDay: 'morning', createdAt: '2026-09-20T08:00:00' });
  const read = makeHabit({ id: 'read', title: 'Read', reminder: 'smart', timeOfDay: 'evening', createdAt: '2026-09-20T08:00:00' });

  it('bundles close reminders into one and keeps far ones apart', () => {
    const plan = planNotifications(input({ habits: [water, stretch, read] }));
    const today = plan.filter((n) => n.date === TODAY);
    expect(today).toEqual([
      expect.objectContaining({ kind: 'habits', minutes: 8 * 60, habitIds: ['water', 'stretch'] }),
      expect.objectContaining({ kind: 'habit', minutes: 19 * 60, habitIds: ['read'] }),
    ]);
    expect(plan.filter((n) => n.date === addDays(TODAY, 6))).toHaveLength(2);
    expect(plan.some((n) => n.date === addDays(TODAY, 7))).toBe(false);
  });

  it('skips habits done or skipped today and anything already past', () => {
    const logs = index([log('water', TODAY, 'completed'), log('stretch', TODAY, 'skipped')]);
    const plan = planNotifications(input({ habits: [water, stretch, read], logsByHabit: logs, nowMinutes: 12 * 60 }));
    expect(plan.filter((n) => n.date === TODAY)).toEqual([expect.objectContaining({ habitIds: ['read'] })]);
  });

  it('respects quiet hours for habit reminders', () => {
    const late = makeHabit({ id: 'late', reminder: 'smart', createdAt: '2026-09-20T08:00:00' });
    const logs = index(['2026-09-20', '2026-09-21', '2026-09-22'].map((d) => log('late', d, 'completed', 23, 30)));
    const plan = planNotifications(input({ habits: [late], logsByHabit: logs }));
    expect(plan[0]?.minutes).toBe(21 * 60 + 45);
  });

  it('reminds an ignored habit only every other day, gently', () => {
    const old = makeHabit({ id: 'old', reminder: 'smart', createdAt: '2026-08-01T08:00:00' });
    const plan = planNotifications(input({ habits: [old] }));
    expect(plan.map((n) => n.date)).toEqual([TODAY, addDays(TODAY, 2), addDays(TODAY, 4), addDays(TODAY, 6)]);
    expect(plan.every((n) => n.gentle)).toBe(true);
  });

  it('adds a streak rescue only for open streaks of 3+ days', () => {
    const plain = [makeHabit({ id: 'a' }), makeHabit({ id: 'b' }), makeHabit({ id: 'c' })];
    const prefs = { ...DEFAULT_NOTIFICATION_PREFS, streakRescue: true };
    const logs = index([log('c', TODAY, 'completed')]);
    const plan = planNotifications(input({ habits: plain, prefs, logsByHabit: logs, streaks: { a: 2, b: 5, c: 9 } }));
    expect(plan).toEqual([expect.objectContaining({ kind: 'rescue', date: TODAY, minutes: prefs.rescueMinutes, habitIds: ['b'] })]);
    expect(planNotifications(input({ habits: plain, prefs, streaks: { a: 2 } }))).toEqual([]);
  });

  it('skips the reflection reminder once reflected and plans a week ahead', () => {
    const plan = planNotifications(input({ reflectionMinutes: 21 * 60, reflectedToday: true }));
    expect(plan.map((n) => n.date)).toEqual([1, 2, 3, 4, 5, 6].map((i) => addDays(TODAY, i)));
  });

  it('plans the morning note with the count and the first habit of the morning', () => {
    const prefs = { ...DEFAULT_NOTIFICATION_PREFS, streakRescue: false, morningPlan: true };
    const habits = [makeHabit({ id: 'eve', timeOfDay: 'evening' }), makeHabit({ id: 'morn', timeOfDay: 'morning' })];
    const [first] = planNotifications(input({ habits, prefs }));
    expect(first).toMatchObject({ kind: 'morning', count: 2, habitIds: ['morn', 'eve'] });
  });

  it('keeps no more than the daily limit, by priority', () => {
    const many = ['a', 'b', 'c'].map((id, i) =>
      makeHabit({ id, reminder: 'smart', timeOfDay: (['morning', 'afternoon', 'evening'] as const)[i], createdAt: '2026-09-20T08:00:00' }),
    );
    const prefs = { ...DEFAULT_NOTIFICATION_PREFS, streakRescue: false, dailyLimit: 2 };
    const today = planNotifications(input({ habits: many, prefs, reflectionMinutes: 21 * 60 })).filter((n) => n.date === TODAY);
    expect(today.map((n) => n.kind)).toEqual(['habit', 'reflection']);
    expect(today[0]?.habitIds).toEqual(['a']);
  });

  it('plans nothing on paused days', () => {
    const pause = { id: 'p', startDate: TODAY, endDate: addDays(TODAY, 2), reason: 'sick' as const, createdAt: 'x' };
    const prefs = { ...DEFAULT_NOTIFICATION_PREFS, streakRescue: true };
    const plan = planNotifications(input({ habits: [water], pauses: [pause], prefs, streaks: { water: 5 } }));
    expect(plan[0]?.date).toBe(addDays(TODAY, 3));
  });
});
