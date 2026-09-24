import type { HabitLogStatus, Task } from '../models';
import { isPerfectDay, shouldAwardFreeze } from '../freezeRewards';
import { reevaluateProgress } from '../habitProgress';
import { placementForNewTask } from '../taskPlanning';
import { dateRange } from '@/core/localDate';

const TODAY = '2026-09-24';
const habit = { id: 'h1', createdAt: '2026-09-01T08:00:00', targetFrequency: 'daily' as const, targetDays: [] };

function week(status: HabitLogStatus, overrides: Record<string, HabitLogStatus> = {}) {
  const byDate = new Map<string, HabitLogStatus>(dateRange('2026-09-17', '2026-09-23').map((d) => [d, status]));
  for (const [d, s] of Object.entries(overrides)) byDate.set(d, s);
  return new Map([['h1', byDate]]);
}

describe('perfect-week freeze rewards', () => {
  it('awards after 7 perfect days ending yesterday', () => {
    expect(shouldAwardFreeze([habit], week('completed'), TODAY, 1, null)).toBe(true);
  });

  it('does not award for a missed or frozen day, at the cap, or for an overlapping week', () => {
    expect(shouldAwardFreeze([habit], week('completed', { '2026-09-20': 'in_progress' }), TODAY, 1, null)).toBe(false);
    expect(shouldAwardFreeze([habit], week('completed', { '2026-09-20': 'forgiven' }), TODAY, 1, null)).toBe(false);
    expect(shouldAwardFreeze([habit], week('completed'), TODAY, 3, null)).toBe(false);
    expect(shouldAwardFreeze([habit], week('completed'), TODAY, 1, '2026-09-18')).toBe(false);
    expect(shouldAwardFreeze([habit], week('completed'), TODAY, 1, '2026-09-16')).toBe(true);
  });

  it('treats skipped as neutral but needs at least one completion per day', () => {
    expect(isPerfectDay([habit], week('skipped'), '2026-09-20')).toBe(false);
    const h2 = { ...habit, id: 'h2' };
    const statuses = new Map([
      ['h1', new Map<string, HabitLogStatus>([['2026-09-20', 'completed']])],
      ['h2', new Map<string, HabitLogStatus>([['2026-09-20', 'skipped']])],
    ]);
    expect(isPerfectDay([habit, h2], statuses, '2026-09-20')).toBe(true);
  });
});

describe('task planning', () => {
  const task = (id: string, dueDate: string | null, isCompleted = false): Task => ({
    id,
    habitId: null,
    title: id,
    isCompleted,
    dueDate,
    createdAt: 'x',
  });

  it('caps today at three open tasks; completed ones free a slot', () => {
    const two = [task('a', TODAY), task('b', TODAY)];
    expect(placementForNewTask(two, TODAY)).toBe(TODAY);
    expect(placementForNewTask([...two, task('c', TODAY)], TODAY)).toBeNull();
    expect(placementForNewTask([...two, task('c', TODAY, true)], TODAY)).toBe(TODAY);
  });
});

describe('reevaluateProgress after editing a habit', () => {
  it('recomputes completion against the new target', () => {
    const quant = { isQuantitative: true, targetCount: 5 };
    expect(reevaluateProgress(quant, { currentCount: 4, status: 'completed' })).toEqual({ currentCount: 4, status: 'in_progress' });
    expect(reevaluateProgress({ ...quant, targetCount: 3 }, { currentCount: 4, status: 'in_progress' }).status).toBe('completed');
    expect(reevaluateProgress(quant, { currentCount: 1, status: 'skipped' }).status).toBe('skipped');
  });
});
