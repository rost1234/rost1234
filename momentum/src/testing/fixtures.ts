import type { Habit } from '@/domain/models';

/** A complete Habit with defaults, for tests. */
export function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'habit',
    title: 'Habit',
    microStep: '',
    isQuantitative: false,
    targetCount: 1,
    unit: '',
    targetFrequency: 'daily',
    targetDays: [],
    createdAt: '2026-09-01T08:00:00',
    isArchived: false,
    why: '',
    growthMode: 'maintain',
    goalCount: null,
    levelStep: null,
    levelSnoozeUntil: null,
    cue: '',
    pairing: '',
    afterHabitId: null,
    timeOfDay: 'any',
    reminder: 'off',
    ...overrides,
  };
}
