import type { LocalDateString } from '@/core/localDate';
import type { HabitLog } from './models';

/**
 * The "Garden" look: a sprout that grows with every day on which at least one habit was done,
 * all history. Counting days (not habits) means adding more habits doesn't make it grow faster.
 * It only ever grows: the stage it reached is kept even if a mark is cleared later.
 */
export const GROWTH_STAGES = [
  { id: 'seed', at: 0 },
  { id: 'sprout', at: 1 },
  { id: 'leaves', at: 3 },
  { id: 'seedling', at: 7 },
  { id: 'plant', at: 14 },
  { id: 'bud', at: 30 },
  { id: 'flower', at: 60 },
  { id: 'bloom', at: 100 },
  { id: 'garden', at: 180 },
] as const;

export type GrowthStageId = (typeof GROWTH_STAGES)[number]['id'];
/** 0 (seed) to 8 (a small garden). */
export type GrowthStage = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export const LAST_STAGE: GrowthStage = 8;

export function growthStage(days: number): GrowthStage {
  let stage = 0;
  GROWTH_STAGES.forEach((s, i) => {
    if (days >= s.at) stage = i;
  });
  return stage as GrowthStage;
}

const asStage = (n: number): GrowthStage => Math.max(0, Math.min(LAST_STAGE, Math.floor(n))) as GrowthStage;

export interface GrowthProgress {
  stage: GrowthStage;
  /** Null at the last stage. */
  next: GrowthStage | null;
  /** Days still needed for the next stage (0 at the last stage). */
  toNext: number;
  /** 0..1 of the way from this stage to the next (1 at the last stage). */
  ratio: number;
}

/**
 * Where the sprout is. `reached` is the highest stage it ever got to: if a mark was cleared since,
 * it stays there (never shrinks) and simply needs the days back before growing again.
 */
export function growthProgress(days: number, reached = 0): GrowthProgress {
  const stage = asStage(Math.max(growthStage(days), reached));
  if (stage === LAST_STAGE) return { stage, next: null, toNext: 0, ratio: 1 };
  const from = GROWTH_STAGES[stage].at;
  const to = GROWTH_STAGES[stage + 1]?.at ?? from;
  const ratio = to > from ? Math.max(0, Math.min(1, (days - from) / (to - from))) : 1;
  return { stage, next: (stage + 1) as GrowthStage, toNext: Math.max(0, to - days), ratio };
}

/** The stage reached when the count went from `before` to `after`, or null if it didn't grow. */
export function grewTo(before: number, after: number): GrowthStage | null {
  const a = growthStage(before);
  const b = growthStage(after);
  return b > a ? b : null;
}

/** Days with at least one habit done: all the days before today, plus today if anything is done. */
export function gardenDays(
  daysBefore: number,
  logs: Readonly<Record<string, Readonly<Record<string, Pick<HabitLog, 'status'>>>>>,
  today: LocalDateString | null,
): number {
  if (!today) return daysBefore;
  const doneToday = Object.values(logs).some((byDate) => byDate[today]?.status === 'completed');
  return daysBefore + (doneToday ? 1 : 0);
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

/** A habit's own pot grows with the days that habit was done, on the same scale as the main sprout. */
export const habitPotStage = (days: number): GrowthStage => growthStage(days);
