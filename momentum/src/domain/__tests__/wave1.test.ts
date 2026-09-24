import type { HabitLogStatus } from '../models';
import { GOALS, PRESETS, TEMPLATE_GROUPS, starterSuggestions } from '../presets';
import { hasCompletionBefore } from '../streaks';

describe('templates', () => {
  it('offers one starter per goal and unique preset keys across all groups', () => {
    expect(starterSuggestions().map((p) => p.key)).toEqual(GOALS.map((g) => PRESETS[g.id][0]?.key));
    const keys = TEMPLATE_GROUPS.flatMap((g) => g.presets.map((p) => p.key));
    expect(new Set(keys).size).toBe(keys.length);
    expect(TEMPLATE_GROUPS.map((g) => g.id)).toEqual(expect.arrayContaining(['sleep', 'study', 'fitness', 'adhd']));
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
