import { create } from 'zustand';
import { toErrorMessage } from '@/core/errors';
import type { LocalDateString } from '@/core/localDate';
import { repositories } from '@/data/repositories';
import type { DayMode, Pause, PauseReason } from '@/domain/models';
import { endPauseChange } from '@/domain/pauses';

interface PlanningState {
  today: LocalDateString | null;
  /** Low-energy mode for today (the micro-step counts as done). */
  dayMode: DayMode | null;
  pauses: Pause[];
  error: string | null;
  load: (today: LocalDateString) => Promise<void>;
  toggleMinimumDay: () => Promise<void>;
  /** Pauses streaks from `start` to `end`, inclusive. */
  addPause: (start: LocalDateString, end: LocalDateString, reason: PauseReason) => Promise<void>;
  updatePause: (id: string, start: LocalDateString, end: LocalDateString, reason: PauseReason) => Promise<void>;
  /** Ends a pause today while keeping the days that already passed paused. */
  endPause: (id: string, today: LocalDateString) => Promise<void>;
  /** Deletes a pause entirely (only offered for pauses that haven't started). */
  removePause: (id: string) => Promise<void>;
}

const byStart = (a: Pause, b: Pause) => a.startDate.localeCompare(b.startDate);

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

  addPause: async (start, end, reason) => {
    const pause = await repositories.pauses.create(start, end, reason);
    set({ pauses: [...get().pauses, pause].sort(byStart) });
  },

  updatePause: async (id, start, end, reason) => {
    const endDate = end < start ? start : end;
    await repositories.pauses.update(id, { startDate: start, endDate, reason });
    set({ pauses: get().pauses.map((p) => (p.id === id ? { ...p, startDate: start, endDate, reason } : p)).sort(byStart) });
  },

  endPause: async (id, today) => {
    const pause = get().pauses.find((p) => p.id === id);
    if (!pause) return;
    const change = endPauseChange(pause, today);
    if (change.kind === 'delete') {
      await get().removePause(id);
    } else if (change.kind === 'shorten') {
      await get().updatePause(id, pause.startDate, change.endDate, pause.reason);
    }
  },

  removePause: async (id) => {
    await repositories.pauses.delete(id);
    set({ pauses: get().pauses.filter((p) => p.id !== id) });
  },
}));
