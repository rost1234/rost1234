import { create } from 'zustand';
import { toErrorMessage } from '@/core/errors';
import { getLocalDeviceDate, type LocalDateString } from '@/core/localDate';
import { repositories } from '@/data/repositories';
import { LOW_MOOD } from '@/domain/insightPicker';
import type { DailyReflection, ReflectionInput } from '@/domain/models';
import { offerMomentLater } from '@/services/sproutMoments';

interface ReflectionState {
  /** Reflections cached by local date. `null` = known to be absent. */
  byDate: Record<LocalDateString, DailyReflection | null>;
  error: string | null;
  loadForDate: (date: LocalDateString) => Promise<void>;
  save: (input: ReflectionInput) => Promise<DailyReflection>;
}

export const useReflectionStore = create<ReflectionState>((set, get) => ({
  byDate: {},
  error: null,

  loadForDate: async (date) => {
    try {
      const reflection = await repositories.reflections.getByDate(date);
      set({ byDate: { ...get().byDate, [date]: reflection }, error: null });
    } catch (error) {
      set({ error: toErrorMessage(error) });
    }
  },

  save: async (input) => {
    const saved = await repositories.reflections.upsert(input);
    set({ byDate: { ...get().byDate, [saved.logDate]: saved }, error: null });
    // A heavy day: the Garden sprout has a gentle study for it on Today.
    if (saved.moodScore <= LOW_MOOD && saved.logDate === getLocalDeviceDate()) offerMomentLater('lowMood', saved.logDate);
    return saved;
  },
}));
