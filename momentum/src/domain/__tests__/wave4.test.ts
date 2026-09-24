import { makeHabit, makeSession } from '@/testing/fixtures';
import type { HabitLog } from '../models';
import { crossedMilestone, orderByTimeOfDay, reminderDates, usualReminderMinutes } from '../rhythm';
import { buildWeeklySummary, previousWeek, weekStart } from '../weekly';

const log = (habitId: string, logDate: string, status: HabitLog['status'], updatedAt = 'x'): HabitLog => ({
  id: `${habitId}${logDate}`,
  habitId,
  logDate,
  currentCount: 1,
  status,
  updatedAt,
});

describe('weekly summary', () => {
  it('uses Sunday–Saturday weeks', () => {
    expect(weekStart('2026-09-24')).toBe('2026-09-20');
    expect(previousWeek('2026-09-24')).toEqual({ start: '2026-09-13', end: '2026-09-19' });
  });

  it('ranks wins, finds one habit to improve and counts perfect days', () => {
    const read = makeHabit({ id: 'read', title: 'Read' });
    const run = makeHabit({ id: 'run', title: 'Run' });
    const week = { start: '2026-09-13', end: '2026-09-19' };
    const days = ['2026-09-13', '2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19'];
    const logs = [...days.map((d) => log('read', d, 'completed')), log('run', '2026-09-13', 'completed')];
    const sessions = [makeSession()];
    const summary = buildWeeklySummary([read, run], logs, sessions, week);
    expect(summary.wins.map((w) => w.habitId)).toEqual(['read', 'run']);
    expect(summary.toImprove?.habitId).toBe('run');
    expect(summary.perfectDays).toBe(1);
    expect(summary.focusMinutes).toBe(25);
    expect(summary.totalCompleted).toBe(8);
  });
});

describe('rhythm', () => {
  it('celebrates each milestone once', () => {
    expect(crossedMilestone(6, 7)).toBe(7);
    expect(crossedMilestone(7, 8)).toBeNull();
    expect(crossedMilestone(29, 30)).toBe(30);
  });

  it('shows the current part of the day first', () => {
    const m = makeHabit({ id: 'm', timeOfDay: 'morning' });
    const a = makeHabit({ id: 'a', timeOfDay: 'afternoon' });
    const e = makeHabit({ id: 'e', timeOfDay: 'evening' });
    const any = makeHabit({ id: 'any' });
    expect(orderByTimeOfDay([m, a, e, any], 14).map((h) => h.id)).toEqual(['a', 'any', 'e', 'm']);
    expect(orderByTimeOfDay([m, a, e, any], 8).map((h) => h.id)).toEqual(['m', 'any', 'a', 'e']);
  });

  it('suggests a reminder a bit before the usual time and skips done days', () => {
    const at = (h: number, m: number) => new Date(2026, 8, 20, h, m).toISOString();
    const logs = [log('r', 'a', 'completed', at(7, 30)), log('r', 'b', 'completed', at(7, 40)), log('r', 'c', 'completed', at(8, 0))];
    expect(usualReminderMinutes(makeHabit(), logs)).toBe(7 * 60 + 25);
    expect(usualReminderMinutes(makeHabit({ timeOfDay: 'evening' }), [])).toBe(19 * 60);
    const weekdays = makeHabit({ targetFrequency: 'specific_days', targetDays: [1, 2, 3, 4, 5] });
    expect(reminderDates(weekdays, '2026-09-24', true)).toEqual(['2026-09-25', '2026-09-28', '2026-09-29', '2026-09-30']);
  });
});
