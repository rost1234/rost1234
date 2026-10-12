import type { LocalDateString } from '@/core/localDate';
import type { HabitLog } from './models';

/**
 * The "Garden" look: a sprout that grows with every habit marked done, all history.
 * It only ever grows. Missed days never shrink or wilt it (no guilt, no loss).
 */
export const GROWTH_STAGES = [
  { id: 'seed', at: 0 },
  { id: 'sprout', at: 1 },
  { id: 'leaves', at: 7 },
  { id: 'seedling', at: 21 },
  { id: 'plant', at: 50 },
  { id: 'bud', at: 100 },
  { id: 'flower', at: 180 },
  { id: 'bloom', at: 300 },
  { id: 'garden', at: 500 },
] as const;

export type GrowthStageId = (typeof GROWTH_STAGES)[number]['id'];
/** 0 (seed) to 8 (a small garden). */
export type GrowthStage = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export const LAST_STAGE: GrowthStage = 8;

export function growthStage(choices: number): GrowthStage {
  let stage = 0;
  GROWTH_STAGES.forEach((s, i) => {
    if (choices >= s.at) stage = i;
  });
  return stage as GrowthStage;
}

export interface GrowthProgress {
  stage: GrowthStage;
  /** Null at the last stage. */
  next: GrowthStage | null;
  /** Choices still needed for the next stage (0 at the last stage). */
  toNext: number;
  /** 0..1 of the way from this stage to the next (1 at the last stage). */
  ratio: number;
}

export function growthProgress(choices: number): GrowthProgress {
  const stage = growthStage(choices);
  if (stage === LAST_STAGE) return { stage, next: null, toNext: 0, ratio: 1 };
  const from = GROWTH_STAGES[stage].at;
  const to = GROWTH_STAGES[stage + 1]?.at ?? from;
  return { stage, next: (stage + 1) as GrowthStage, toNext: to - choices, ratio: to > from ? (choices - from) / (to - from) : 1 };
}

/** The stage reached when the count went from `before` to `after`, or null if it didn't grow. */
export function grewTo(before: number, after: number): GrowthStage | null {
  const a = growthStage(before);
  const b = growthStage(after);
  return b > a ? b : null;
}

/** Every completed habit-day: all completions before today plus today's. */
export function totalChoices(
  completedBefore: Readonly<Record<string, number>>,
  logs: Readonly<Record<string, Readonly<Record<string, Pick<HabitLog, 'status'>>>>>,
  today: LocalDateString | null,
): number {
  let total = 0;
  for (const count of Object.values(completedBefore)) total += count;
  if (today) {
    for (const byDate of Object.values(logs)) {
      if (byDate[today]?.status === 'completed') total += 1;
    }
  }
  return total;
}

/**
 * The sprout's face today. It is never sad: before anything is done it is calm (or sleepy at
 * night), it smiles as the day fills, and beams when everything is done.
 */
export type SproutMood = 'calm' | 'happy' | 'joy' | 'sleepy';

export function sproutMood(percent: number, hour: number, dueCount: number): SproutMood {
  if (dueCount > 0 && percent >= 100) return 'joy';
  if (hour >= 22 || hour < 5) return 'sleepy';
  if (dueCount > 0 && percent > 0) return 'happy';
  return 'calm';
}

/** Night sky (moon and stars) instead of the sun in the Garden header. */
export const isNight = (hour: number): boolean => hour >= 19 || hour < 5;

/** A focus session grows its own small plant: from a sprout at the start to a flower at the end. */
export function focusStage(progress: number): GrowthStage {
  const clamped = Math.max(0, Math.min(1, progress));
  return Math.min(6, 1 + Math.floor(clamped * 6)) as GrowthStage;
}

/** A single habit's pot on its card grows twice as fast as the main sprout (one habit, fewer days). */
export const habitPotStage = (choices: number): GrowthStage => growthStage(choices * 2);
