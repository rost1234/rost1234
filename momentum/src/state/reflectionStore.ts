import { create } from 'zustand';
import { toErrorMessage } from '@/core/errors';
import type { LocalDateString } from '@/core/localDate';
import { repositories } from '@/data/repositories';
import type { DailyReflection, ReflectionInput } from '@/domain/models';

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
    return saved;
  },
}));
