import { gardenDays, growthProgress, type GrowthProgress, type GrowthStage } from '@/domain/garden';
import { useGardenStore } from '@/state/gardenStore';
import { useHabitStore } from '@/state/habitStore';
import type { TranslationKey } from '@/i18n';

/** Days with a habit done so far (today included) and how far the sprout has grown. It never shrinks. */
export function useGardenGrowth(): GrowthProgress & { days: number } {
  const days = useHabitStore((s) => gardenDays(s.completedDaysBefore, s.logs, s.today));
  const reached = useGardenStore((s) => s.reached);
  return { days, ...growthProgress(days, reached) };
}

/** One habit's own pot: the days it was done so far, today included. */
export function useHabitDays(habitId: string): number {
  return useHabitStore((s) => (s.completedBefore[habitId] ?? 0) + (s.today && s.logs[habitId]?.[s.today]?.status === 'completed' ? 1 : 0));
}

const STAGE_KEYS: Record<GrowthStage, TranslationKey> = {
  0: 'garden.stage.seed',
  1: 'garden.stage.sprout',
  2: 'garden.stage.leaves',
  3: 'garden.stage.seedling',
  4: 'garden.stage.plant',
  5: 'garden.stage.bud',
  6: 'garden.stage.flower',
  7: 'garden.stage.bloom',
  8: 'garden.stage.garden',
};

export const stageKey = (stage: GrowthStage): TranslationKey => STAGE_KEYS[stage];
