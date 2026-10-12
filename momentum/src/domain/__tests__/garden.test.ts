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
  gardenDays,
} from '../garden';
import { sproutShapes } from '@/features/garden/sproutArt';

describe('garden growth', () => {
  it('starts as a seed and grows at each threshold (in days with a habit done)', () => {
    expect(growthStage(0)).toBe(0);
    expect(growthStage(1)).toBe(1);
    expect(growthStage(2)).toBe(1);
    expect(growthStage(3)).toBe(2);
    expect(growthStage(29)).toBe(4);
    expect(growthStage(30)).toBe(5);
    expect(growthStage(180)).toBe(LAST_STAGE);
    expect(growthStage(100_000)).toBe(LAST_STAGE);
  });

  it('thresholds only go up', () => {
    for (let i = 1; i < GROWTH_STAGES.length; i += 1) {
      expect(GROWTH_STAGES[i]!.at).toBeGreaterThan(GROWTH_STAGES[i - 1]!.at);
    }
  });

  it('tells how far it is to the next stage', () => {
    expect(growthProgress(10)).toEqual({ stage: 3, next: 4, toNext: 4, ratio: 3 / 7 });
    expect(growthProgress(0)).toEqual({ stage: 0, next: 1, toNext: 1, ratio: 0 });
    expect(growthProgress(600)).toEqual({ stage: 8, next: null, toNext: 0, ratio: 1 });
  });

  it('never shrinks: a stage once reached stays even if a mark is cleared', () => {
    // Reached "plant" (14 days), then a day was cleared: still a plant, 0% of the way to a bud.
    expect(growthProgress(13, 4)).toEqual({ stage: 4, next: 5, toNext: 17, ratio: 0 });
    // History says more than the record: history wins.
    expect(growthProgress(30, 2).stage).toBe(5);
    // Garbage records are clamped.
    expect(growthProgress(0, 99).stage).toBe(LAST_STAGE);
  });

  it('reports growth only when a stage is crossed', () => {
    expect(grewTo(2, 3)).toBe(2);
    expect(grewTo(3, 4)).toBeNull();
    // Undo never "shrinks" into a celebration.
    expect(grewTo(3, 2)).toBeNull();
  });

  it('counts days with a habit done, not habits: today adds at most one', () => {
    const logs = {
      a: { '2026-10-12': { status: 'completed' as const }, '2026-10-11': { status: 'completed' as const } },
      b: { '2026-10-12': { status: 'completed' as const } },
      c: { '2026-10-12': { status: 'skipped' as const } },
    };
    expect(gardenDays(5, logs, '2026-10-12')).toBe(6);
    expect(gardenDays(5, { c: logs.c }, '2026-10-12')).toBe(5);
    expect(gardenDays(4, {}, null)).toBe(4);
  });

  it("a habit's own pot uses the same scale", () => {
    expect(habitPotStage(0)).toBe(0);
    expect(habitPotStage(3)).toBe(2);
    expect(habitPotStage(30)).toBe(5);
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
