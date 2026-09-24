import { dateRange } from '@/core/localDate';
import { makeHabit } from '@/testing/fixtures';
import type { HabitLogStatus, Pause } from '../models';
import { suggestLevelChange } from '../levels';
import { activePause, applyPauses } from '../pauses';
import { orderByStacking } from '../stacking';
import { computeStreak } from '../streaks';

const TODAY = '2026-09-24';
const week = (status: HabitLogStatus, overrides: Record<string, HabitLogStatus> = {}) => {
  const m = new Map<string, HabitLogStatus>(dateRange('2026-09-17', '2026-09-23').map((d) => [d, status]));
  for (const [d, s] of Object.entries(overrides)) m.set(d, s);
  return m;
};
const reading = makeHabit({ id: 'read', isQuantitative: true, targetCount: 4, unit: 'pages', growthMode: 'grow', goalCount: 10, levelStep: 2 });

describe('level suggestions', () => {
  it('suggests going up after 6+ of 7 days, capped at the goal', () => {
    expect(suggestLevelChange(reading, week('completed', { '2026-09-20': 'in_progress' }), TODAY)).toMatchObject({ kind: 'up', from: 4, to: 6 });
    expect(suggestLevelChange({ ...reading, targetCount: 9 }, week('completed'), TODAY)).toMatchObject({ kind: 'up', to: 10 });
    expect(suggestLevelChange({ ...reading, targetCount: 10 }, week('completed'), TODAY)).toMatchObject({ kind: 'goal_reached' });
  });

  it('suggests easing off after 3+ misses and ignores skipped/frozen days', () => {
    expect(suggestLevelChange(reading, week('in_progress'), TODAY)).toMatchObject({ kind: 'down', from: 4, to: 2 });
    expect(suggestLevelChange(reading, week('skipped'), TODAY)).toBeNull();
  });

  it('respects maintain mode, snoozes and too-new habits', () => {
    expect(suggestLevelChange({ ...reading, growthMode: 'maintain' }, week('completed'), TODAY)).toBeNull();
    expect(suggestLevelChange({ ...reading, levelSnoozeUntil: '2026-09-30' }, week('completed'), TODAY)).toBeNull();
    expect(suggestLevelChange({ ...reading, createdAt: '2026-09-20T08:00:00' }, week('completed'), TODAY)).toBeNull();
  });
});

describe('pauses', () => {
  const vacation: Pause = { id: 'p', startDate: '2026-09-20', endDate: '2026-09-22', reason: 'vacation', createdAt: 'x' };

  it('turns paused days into neutral days so the streak survives', () => {
    const statuses = new Map<string, HabitLogStatus>([
      ['2026-09-18', 'completed'],
      ['2026-09-19', 'completed'],
      ['2026-09-21', 'completed'],
      ['2026-09-23', 'completed'],
    ]);
    const habit = makeHabit();
    expect(computeStreak(habit, statuses, TODAY)).toBe(1);
    expect(computeStreak(habit, applyPauses(statuses, [vacation], TODAY), TODAY)).toBe(4);
  });

  it('finds the active pause', () => {
    expect(activePause([vacation], '2026-09-21')?.id).toBe('p');
    expect(activePause([vacation], TODAY)).toBeNull();
  });
});

describe('habit stacking', () => {
  it('puts stacked habits right after their anchor and survives bad links', () => {
    const a = makeHabit({ id: 'a' });
    const b = makeHabit({ id: 'b', afterHabitId: 'c' });
    const c = makeHabit({ id: 'c' });
    const d = makeHabit({ id: 'd', afterHabitId: 'missing' });
    expect(orderByStacking([a, b, c, d]).map((h) => h.id)).toEqual(['a', 'c', 'b', 'd']);
    const x = makeHabit({ id: 'x', afterHabitId: 'y' });
    const y = makeHabit({ id: 'y', afterHabitId: 'x' });
    expect(orderByStacking([x, y]).map((h) => h.id).sort()).toEqual(['x', 'y']);
  });
});
