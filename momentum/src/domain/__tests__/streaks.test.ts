import type { HabitLogStatus } from '../models';
import { computeStreak, planStreakFreezes } from '../streaks';

const TODAY = '2026-09-24'; // Thursday
const daily = { id: 'h1', createdAt: '2026-09-01T08:00:00', targetFrequency: 'daily' as const, targetDays: [] };

const statuses = (entries: Record<string, HabitLogStatus>) => new Map(Object.entries(entries));

describe('computeStreak', () => {
  it('counts consecutive completed days and does not break on an unfinished today', () => {
    const s = statuses({ '2026-09-21': 'completed', '2026-09-22': 'completed', '2026-09-23': 'completed' });
    expect(computeStreak(daily, s, TODAY)).toBe(3);
    expect(computeStreak(daily, new Map([...s, [TODAY, 'completed']]), TODAY)).toBe(4);
  });

  it('breaks on a missed day but is bridged by forgiven/skipped days', () => {
    expect(computeStreak(daily, statuses({ '2026-09-21': 'completed', '2026-09-23': 'completed' }), TODAY)).toBe(1);
    expect(
      computeStreak(daily, statuses({ '2026-09-21': 'completed', '2026-09-22': 'forgiven', '2026-09-23': 'completed' }), TODAY),
    ).toBe(2);
  });

  it('ignores non-scheduled days', () => {
    const mwf = { ...daily, targetFrequency: 'specific_days' as const, targetDays: [1 as const, 3 as const] };
    // Mon 21 + Wed 23 completed; Tue 22 is not scheduled.
    expect(computeStreak(mwf, statuses({ '2026-09-21': 'completed', '2026-09-23': 'completed' }), TODAY)).toBe(2);
  });
});

describe('planStreakFreezes', () => {
  it('forgives a missed day that interrupts a live streak', () => {
    const s = new Map([['h1', statuses({ '2026-09-21': 'completed', '2026-09-22': 'completed' })]]);
    const plan = planStreakFreezes([daily], s, TODAY, 2);
    expect(plan).toEqual({ items: [{ habitId: 'h1', dates: ['2026-09-23'] }], freezesUsed: 1 });
  });

  it('does nothing when no freezes, no gap, or no streak to protect', () => {
    const live = new Map([['h1', statuses({ '2026-09-22': 'completed' })]]);
    expect(planStreakFreezes([daily], live, TODAY, 0).freezesUsed).toBe(0);
    const noGap = new Map([['h1', statuses({ '2026-09-23': 'completed' })]]);
    expect(planStreakFreezes([daily], noGap, TODAY, 2).freezesUsed).toBe(0);
    expect(planStreakFreezes([daily], new Map(), TODAY, 2).freezesUsed).toBe(0);
  });

  it('does not spend freezes when the gap is larger than the pool', () => {
    const s = new Map([['h1', statuses({ '2026-09-20': 'completed' })]]);
    expect(planStreakFreezes([daily], s, TODAY, 2).freezesUsed).toBe(0);
    expect(planStreakFreezes([daily], s, TODAY, 3).items[0]?.dates).toEqual(['2026-09-21', '2026-09-22', '2026-09-23']);
  });

  it('shares one pool across habits', () => {
    const h2 = { ...daily, id: 'h2' };
    const s = new Map([
      ['h1', statuses({ '2026-09-22': 'completed' })],
      ['h2', statuses({ '2026-09-22': 'completed' })],
    ]);
    const plan = planStreakFreezes([daily, h2], s, TODAY, 1);
    expect(plan.freezesUsed).toBe(1);
    expect(plan.items.map((i) => i.habitId)).toEqual(['h1']);
  });
});
