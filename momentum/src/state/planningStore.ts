import { create } from 'zustand';
import { toErrorMessage } from '@/core/errors';
import { addDays, type LocalDateString } from '@/core/localDate';
import { repositories } from '@/data/repositories';
import type { DayMode, Pause, PauseReason } from '@/domain/models';

interface PlanningState {
  today: LocalDateString | null;
  /** Low-energy mode for today (the micro-step counts as done). */
  dayMode: DayMode | null;
  pauses: Pause[];
  error: string | null;
  load: (today: LocalDateString) => Promise<void>;
  toggleMinimumDay: () => Promise<void>;
  /** Pauses streaks from `start` for `days` days (inclusive of start). */
  addPause: (start: LocalDateString, days: number, reason: PauseReason) => Promise<void>;
  removePause: (id: string) => Promise<void>;
}

/** Hard-day tools: low-energy days and planned pauses (vacation / sick). */
export const usePlanningStore = create<PlanningState>((set, get) => ({
  today: null,
  dayMode: null,
  pauses: [],
  error: null,

  load: async (today) => {
    try {
      const [dayMode, pauses] = await Promise.all([repositories.dayModes.get(today), repositories.pauses.getAll()]);
      set({ today, dayMode, pauses, error: null });
    } catch (error) {
      set({ today, error: toErrorMessage(error) });
    }
  },

  toggleMinimumDay: async () => {
    const { today, dayMode } = get();
    if (!today) return;
    const next = dayMode === 'minimum' ? null : 'minimum';
    set({ dayMode: next });
    try {
      await repositories.dayModes.set(today, next);
    } catch (error) {
      set({ dayMode, error: toErrorMessage(error) });
    }
  },

  addPause: async (start, days, reason) => {
    const pause = await repositories.pauses.create(start, addDays(start, Math.max(1, days) - 1), reason);
    set({ pauses: [...get().pauses, pause].sort((a, b) => a.startDate.localeCompare(b.startDate)) });
  },

  removePause: async (id) => {
    await repositories.pauses.delete(id);
    set({ pauses: get().pauses.filter((p) => p.id !== id) });
  },
}));
