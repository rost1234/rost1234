import type { HabitLogStatus } from '../models';
import { goals, presetsForGoal, starterSuggestions, templateGroups } from '../presets';
import { hasCompletionBefore } from '../streaks';

describe('templates', () => {
  it('offers one starter per goal and unique preset keys across all groups', () => {
    expect(starterSuggestions('en').map((p) => p.key)).toEqual(goals('en').map((g) => presetsForGoal(g.id, 'en')[0]?.key));
    const keys = templateGroups('en').flatMap((g) => g.presets.map((p) => p.key));
    expect(new Set(keys).size).toBe(keys.length);
    expect(templateGroups('en').map((g) => g.id)).toEqual(expect.arrayContaining(['sleep', 'study', 'fitness', 'adhd']));
    // Every preset exists in Hebrew too, with the same keys and targets.
    const he = templateGroups('he').flatMap((g) => g.presets);
    expect(he.map((p) => p.key)).toEqual(keys);
    expect(he.every((p) => p.habit.title.length > 0 && p.summary.length > 0)).toBe(true);
  });
});

describe('fresh start', () => {
  it('knows whether a habit was ever completed before a date', () => {
    const statuses = new Map<string, HabitLogStatus>([
      ['2026-09-10', 'completed'],
      ['2026-09-24', 'completed'],
    ]);
    expect(hasCompletionBefore(statuses, '2026-09-24')).toBe(true);
    expect(hasCompletionBefore(statuses, '2026-09-10')).toBe(false);
    expect(hasCompletionBefore(new Map([['2026-09-20', 'forgiven' as const]]), '2026-09-24')).toBe(false);
  });
});
