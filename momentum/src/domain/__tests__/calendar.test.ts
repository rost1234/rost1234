import { addMonths, dateRange, monthDays, monthGrid, monthStart } from '@/core/localDate';
import { makeHabit } from '@/testing/fixtures';
import { buildHeatmap } from '../analytics';
import { applyDayEdit, buildCalendarDays, dayEditActions, habitDayDetails, summarizeMonth } from '../calendar';
import { freezeHistory, perfectDaysTowardNextFreeze } from '../freezeRewards';
import type { HabitLog, HabitLogStatus, Pause } from '../models';
import { activePause, applyPausesToAll, endPauseChange, isPaused } from '../pauses';

const log = (habitId: string, logDate: string, status: HabitLogStatus, currentCount = status === 'completed' ? 1 : 0): HabitLog => ({
  id: `${habitId}-${logDate}`,
  habitId,
  logDate,
  currentCount,
  status,
  updatedAt: 'x',
});

describe('month helpers', () => {
  it('builds Sunday-first weeks padded with nulls', () => {
    const september = monthGrid('2026-09-17');
    expect(september).toHaveLength(5);
    expect(september[0]).toEqual([null, null, '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05']);
    expect(september[4]?.slice(0, 3)).toEqual(['2026-09-27', '2026-09-28', '2026-09-29']);
    // August 2026 starts on a Saturday: six rows.
    expect(monthGrid('2026-08-01')).toHaveLength(6);
  });

  it('moves between months and years and knows month lengths', () => {
    expect(monthStart('2026-09-27')).toBe('2026-09-01');
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-01');
    expect(addMonths('2026-01-31', -1)).toBe('2025-12-01');
    expect(monthDays('2028-02-10')).toHaveLength(29);
  });
});

describe('ending a pause early', () => {
  const pause: Pause = { id: 'p', startDate: '2026-09-26', endDate: '2026-09-29', reason: 'sick', createdAt: 'x' };

  it('keeps the days that already passed paused', () => {
    expect(endPauseChange(pause, '2026-09-27')).toEqual({ kind: 'shorten', endDate: '2026-09-26' });
    expect(endPauseChange(pause, '2026-09-29')).toEqual({ kind: 'shorten', endDate: '2026-09-28' });
  });

  it('deletes a pause that has not started and leaves a finished one alone', () => {
    expect(endPauseChange(pause, '2026-09-26')).toEqual({ kind: 'delete' });
    expect(endPauseChange(pause, '2026-09-20')).toEqual({ kind: 'delete' });
    expect(endPauseChange(pause, '2026-10-01')).toEqual({ kind: 'none' });
  });
});

describe('monthly calendar', () => {
  const a = makeHabit({ id: 'a', title: 'Meditate' });
  const b = makeHabit({ id: 'b', title: 'Water', isQuantitative: true, targetCount: 4 });
  const pauses: Pause[] = [{ id: 'p', startDate: '2026-09-03', endDate: '2026-09-04', reason: 'vacation', createdAt: 'x' }];
  const logs = [
    log('a', '2026-09-01', 'completed'),
    log('b', '2026-09-01', 'completed', 4),
    log('a', '2026-09-02', 'forgiven'),
    log('b', '2026-09-02', 'in_progress', 2),
    log('a', '2026-09-05', 'skipped'),
    log('b', '2026-09-05', 'completed', 4),
  ];
  const today = '2026-09-10';
  const days = buildCalendarDays([a, b], logs, pauses, monthDays(today), today);
  const day = (d: string) => days.find((x) => x.date === d);

  it('summarises each day, keeping freezes, pauses and skips apart', () => {
    expect(day('2026-09-01')).toMatchObject({ percent: 100, perfect: true, freezes: 0, pause: null });
    // The frozen habit counts as not done; the other is half way.
    expect(day('2026-09-02')).toMatchObject({ percent: 25, perfect: false, freezes: 1 });
    expect(day('2026-09-03')).toMatchObject({ percent: null, perfect: false, pause: pauses[0] });
    // A skipped habit doesn't count against the day.
    expect(day('2026-09-05')).toMatchObject({ percent: 100, perfect: true });
    expect(day('2026-09-06')).toMatchObject({ percent: 0, perfect: false });
    expect(day('2026-09-11')).toMatchObject({ future: true, percent: null });
  });

  it('can look at a single habit', () => {
    const water = buildCalendarDays([a, b], logs, pauses, ['2026-09-02'], today, 'b');
    expect(water[0]).toMatchObject({ percent: 50, freezes: 0 });
  });

  it('summarises the month up to today', () => {
    expect(summarizeMonth(days)).toEqual({ perfectDays: 2, freezesUsed: 1, pausedDays: 2, averagePercent: 28 });
  });

  it('lists what happened to every scheduled habit on a day', () => {
    expect(habitDayDetails([a, b], logs, pauses, '2026-09-02', today).map((d) => [d.habit.id, d.state, d.count])).toEqual([
      ['a', 'forgiven', 0],
      ['b', 'partial', 2],
    ]);
    expect(habitDayDetails([a, b], logs, pauses, '2026-09-03', today).map((d) => d.state)).toEqual(['paused', 'paused']);
  });

  it('shows paused days as paused on the heatmap, not as skips', () => {
    const [row] = buildHeatmap([a], logs, ['2026-09-03', '2026-09-05'], today, pauses);
    expect(row?.cells.map((c) => c.state)).toEqual(['paused', 'skipped']);
  });
});

describe('freeze progress and history', () => {
  const habit = makeHabit({ id: 'h' });
  const statuses = new Map([['h', new Map<string, HabitLogStatus>(dateRange('2026-09-20', '2026-09-23').map((d) => [d, 'completed']))]]);

  it('counts perfect days toward the next freeze since the last award', () => {
    expect(perfectDaysTowardNextFreeze([habit], statuses, '2026-09-24', null)).toBe(4);
    expect(perfectDaysTowardNextFreeze([habit], statuses, '2026-09-24', '2026-09-21')).toBe(2);
    expect(perfectDaysTowardNextFreeze([habit], statuses, '2026-09-25', null)).toBe(0);
  });

  it('lists the days a freeze covered with the streak it kept', () => {
    const withFreeze = new Map([
      ['h', new Map<string, HabitLogStatus>([...dateRange('2026-09-18', '2026-09-21').map((d) => [d, 'completed'] as const), ['2026-09-22', 'forgiven']])],
    ]);
    expect(freezeHistory([habit], withFreeze)).toEqual([{ date: '2026-09-22', habitId: 'h', streakSaved: 4 }]);
  });
});

describe('single-habit pauses', () => {
  const a = makeHabit({ id: 'a' });
  const b = makeHabit({ id: 'b' });
  const gymOnly: Pause = { id: 'g', startDate: '2026-09-03', endDate: '2026-09-04', reason: 'sick', createdAt: 'x', habitId: 'b' };
  const logs = [log('a', '2026-09-03', 'completed')];

  it('covers only the named habit', () => {
    expect(isPaused([gymOnly], '2026-09-03', 'b')).toBe(true);
    expect(isPaused([gymOnly], '2026-09-03', 'a')).toBe(false);
    expect(isPaused([gymOnly], '2026-09-03')).toBe(false);
    expect(activePause([gymOnly], '2026-09-03')).toBeNull();
    const statuses = applyPausesToAll(new Map(), ['a', 'b'], [gymOnly], '2026-09-04');
    expect(statuses.get('a')?.get('2026-09-03')).toBeUndefined();
    expect(statuses.get('b')?.get('2026-09-03')).toBe('skipped');
  });

  it('leaves the paused habit out of the day instead of banding the whole calendar', () => {
    const [all] = buildCalendarDays([a, b], logs, [gymOnly], ['2026-09-03'], '2026-09-10');
    expect(all).toMatchObject({ percent: 100, perfect: true, pause: null });
    const [gym] = buildCalendarDays([a, b], logs, [gymOnly], ['2026-09-03'], '2026-09-10', 'b');
    expect(gym).toMatchObject({ percent: null, pause: gymOnly });
    expect(habitDayDetails([a, b], logs, [gymOnly], '2026-09-03', '2026-09-10').map((d) => d.state)).toEqual(['completed', 'paused']);
  });
});

describe('archived habits in the calendar', () => {
  const active = makeHabit({ id: 'a' });
  const archived = makeHabit({ id: 'old', isArchived: true });
  const logs = [log('a', '2026-09-02', 'completed'), log('old', '2026-09-02', 'completed'), log('a', '2026-09-03', 'completed')];

  it('counts an archived habit only on days it was logged', () => {
    const days = buildCalendarDays([active, archived], logs, [], ['2026-09-02', '2026-09-03'], '2026-09-10');
    // Logged before archiving: still part of that day.
    expect(days[0]).toMatchObject({ percent: 100, perfect: true });
    // Nothing logged: the archived habit doesn't turn the day into a miss.
    expect(days[1]).toMatchObject({ percent: 100, perfect: true });
    expect(habitDayDetails([active, archived], logs, [], '2026-09-03', '2026-09-10').map((d) => d.habit.id)).toEqual(['a']);
  });
});

describe('editing a day', () => {
  const binary = { isQuantitative: false, targetCount: 1 };
  const water = { isQuantitative: true, targetCount: 4 };

  it('offers actions that fit the day', () => {
    expect(dayEditActions(binary, 'missed', 0)).toEqual(['done', 'skip']);
    expect(dayEditActions(binary, 'completed', 1)).toEqual(['undo', 'skip']);
    expect(dayEditActions(water, 'partial', 2)).toEqual(['done', 'plus', 'minus', 'undo', 'skip']);
    expect(dayEditActions(water, 'completed', 4)).toEqual(['minus', 'undo', 'skip']);
    expect(dayEditActions(binary, 'skipped', 0)).toEqual(['unskip', 'done']);
    expect(dayEditActions(binary, 'forgiven', 0)).toEqual(['done']);
    expect(dayEditActions(binary, 'not_scheduled', 0)).toEqual([]);
  });

  it('applies them', () => {
    expect(applyDayEdit(binary, { currentCount: 0, status: 'in_progress' }, 'done')).toEqual({ currentCount: 1, status: 'completed' });
    expect(applyDayEdit(water, { currentCount: 1, status: 'in_progress' }, 'done')).toEqual({ currentCount: 4, status: 'completed' });
    expect(applyDayEdit(water, { currentCount: 3, status: 'in_progress' }, 'plus')).toEqual({ currentCount: 4, status: 'completed' });
    expect(applyDayEdit(water, { currentCount: 4, status: 'completed' }, 'minus')).toEqual({ currentCount: 3, status: 'in_progress' });
    expect(applyDayEdit(water, { currentCount: 2, status: 'in_progress' }, 'undo')).toEqual({ currentCount: 0, status: 'in_progress' });
    expect(applyDayEdit(water, { currentCount: 2, status: 'in_progress' }, 'skip')).toEqual({ currentCount: 2, status: 'skipped' });
    expect(applyDayEdit(water, { currentCount: 2, status: 'skipped' }, 'unskip')).toEqual({ currentCount: 2, status: 'in_progress' });
  });
});
