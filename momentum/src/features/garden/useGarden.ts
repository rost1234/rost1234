import { growthProgress, totalChoices, type GrowthProgress, type GrowthStage } from '@/domain/garden';
import { useHabitStore } from '@/state/habitStore';
import type { TranslationKey } from '@/i18n';

/** Every habit-day done so far (today included) and how far the sprout has grown. */
export function useGardenGrowth(): GrowthProgress & { choices: number } {
  const choices = useHabitStore((s) => totalChoices(s.completedBefore, s.logs, s.today));
  return { choices, ...growthProgress(choices) };
}

/** One habit's own pot: its completions so far, today included. */
export function useHabitChoices(habitId: string): number {
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
