import {
  focusStage,
  GROWTH_STAGES,
  grewTo,
  growthProgress,
  growthStage,
  habitPotStage,
  isNight,
  LAST_STAGE,
  sproutMood,
  totalChoices,
} from '../garden';
import { sproutShapes } from '@/features/garden/sproutArt';

describe('garden growth', () => {
  it('starts as a seed and grows at each threshold', () => {
    expect(growthStage(0)).toBe(0);
    expect(growthStage(1)).toBe(1);
    expect(growthStage(6)).toBe(1);
    expect(growthStage(7)).toBe(2);
    expect(growthStage(99)).toBe(4);
    expect(growthStage(100)).toBe(5);
    expect(growthStage(500)).toBe(LAST_STAGE);
    expect(growthStage(100_000)).toBe(LAST_STAGE);
  });

  it('thresholds only go up', () => {
    for (let i = 1; i < GROWTH_STAGES.length; i += 1) {
      expect(GROWTH_STAGES[i]!.at).toBeGreaterThan(GROWTH_STAGES[i - 1]!.at);
    }
  });

  it('tells how far it is to the next stage', () => {
    expect(growthProgress(10)).toEqual({ stage: 2, next: 3, toNext: 11, ratio: 3 / 14 });
    expect(growthProgress(0)).toEqual({ stage: 0, next: 1, toNext: 1, ratio: 0 });
    expect(growthProgress(600)).toEqual({ stage: 8, next: null, toNext: 0, ratio: 1 });
  });

  it('reports growth only when a stage is crossed', () => {
    expect(grewTo(6, 7)).toBe(2);
    expect(grewTo(7, 8)).toBeNull();
    // Undo never "shrinks" into a celebration.
    expect(grewTo(7, 6)).toBeNull();
  });

  it('counts every completed habit-day, today included', () => {
    const logs = {
      a: { '2026-10-12': { status: 'completed' as const }, '2026-10-11': { status: 'completed' as const } },
      b: { '2026-10-12': { status: 'in_progress' as const } },
      c: { '2026-10-12': { status: 'skipped' as const } },
    };
    // Days before today come from completedBefore; only today's logs are added on top.
    expect(totalChoices({ a: 5, b: 2 }, logs, '2026-10-12')).toBe(8);
    expect(totalChoices({}, {}, null)).toBe(0);
  });

  it('a single habit pot grows faster than the main sprout', () => {
    expect(habitPotStage(0)).toBe(0);
    expect(habitPotStage(4)).toBe(2);
    expect(habitPotStage(50)).toBe(5);
  });
});

describe('sprout mood', () => {
  it('is never sad: calm before anything, happy on the way, joy when all done', () => {
    expect(sproutMood(0, 10, 3)).toBe('calm');
    expect(sproutMood(40, 10, 3)).toBe('happy');
    expect(sproutMood(100, 10, 3)).toBe('joy');
    expect(sproutMood(100, 23, 3)).toBe('joy');
    expect(sproutMood(40, 23, 3)).toBe('sleepy');
    expect(sproutMood(0, 3, 3)).toBe('sleepy');
    // A day with nothing scheduled isn't a "done" day.
    expect(sproutMood(100, 10, 0)).toBe('calm');
  });

  it('knows night from day', () => {
    expect(isNight(12)).toBe(false);
    expect(isNight(20)).toBe(true);
    expect(isNight(4)).toBe(true);
  });

  it('a focus session grows from a sprout to a flower', () => {
    expect(focusStage(0)).toBe(1);
    expect(focusStage(0.5)).toBe(4);
    expect(focusStage(1)).toBe(6);
    expect(focusStage(2)).toBe(6);
  });
});

describe('sprout art', () => {
  it('draws every stage and mood inside the 100×100 box', () => {
    const moods = ['calm', 'happy', 'joy', 'sleepy'] as const;
    for (let stage = 0; stage <= LAST_STAGE; stage += 1) {
      for (const mood of moods) {
        const shapes = sproutShapes(stage as Parameters<typeof sproutShapes>[0], mood);
        expect(shapes.length).toBeGreaterThan(5);
        for (const s of shapes) {
          if (s.kind === 'circle') {
            expect(s.cx - s.r).toBeGreaterThanOrEqual(0);
            expect(s.cx + s.r).toBeLessThanOrEqual(100);
            expect(s.cy - s.r).toBeGreaterThanOrEqual(0);
          }
          if (s.kind === 'path') expect(s.d).not.toMatch(/NaN|undefined/);
        }
      }
    }
  });

  it('later stages have more to them, and the small pots have no face', () => {
    expect(sproutShapes(8, 'calm').length).toBeGreaterThan(sproutShapes(2, 'calm').length);
    expect(sproutShapes(3, 'calm', false).length).toBeLessThan(sproutShapes(3, 'calm', true).length);
  });
});
