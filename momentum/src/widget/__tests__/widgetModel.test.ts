import type { Habit, HabitLog } from '@/domain/models';
import { buildTodayWidgetModel, rowsForHeight } from '../widgetModel';

const TODAY = '2026-09-24';
const habit = (id: string, extra: Partial<Habit> = {}): Habit => ({
  id,
  title: id,
  microStep: '',
  isQuantitative: false,
  targetCount: 1,
  unit: '',
  targetFrequency: 'daily',
  targetDays: [],
  createdAt: '2026-09-01T08:00:00',
  isArchived: false,
  why: '',
  ...extra,
});
const log = (habitId: string, currentCount: number, status: HabitLog['status']): HabitLog => ({
  id: `l-${habitId}`,
  habitId,
  logDate: TODAY,
  currentCount,
  status,
  updatedAt: 'x',
});

describe('buildTodayWidgetModel', () => {
  const habits = [
    habit('read'),
    habit('water', { isQuantitative: true, targetCount: 4, unit: 'glasses' }),
    habit('walk'),
  ];

  it('lists open habits first, with counts and overall percent', () => {
    const model = buildTodayWidgetModel(habits, [log('read', 1, 'completed'), log('water', 2, 'in_progress')], TODAY, 5, true);
    if (model.kind !== 'ready') throw new Error('expected ready');
    expect(model.rows.map((r) => [r.habitId, r.detail])).toEqual([
      ['water', '2/4 glasses'],
      ['walk', ''],
      ['read', 'Done'],
    ]);
    expect(model.percent).toBe(50);
  });

  it('truncates to the rows that fit and reports the rest', () => {
    const model = buildTodayWidgetModel(habits, [], TODAY, 2, true);
    expect(model.kind === 'ready' && [model.rows.length, model.hiddenCount]).toEqual([2, 1]);
  });

  it('asks to finish setup before onboarding', () => {
    expect(buildTodayWidgetModel(habits, [], TODAY, 5, false).kind).toBe('setup');
  });

  it('fits rows to the widget height', () => {
    expect(rowsForHeight(110)).toBe(1);
    expect(rowsForHeight(260)).toBe(6);
  });
});
