import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { runDetached } from '@/core/errors';
import type { LocalDateString } from '@/core/localDate';

const KEY = 'momentum.highlight.v1';

interface HighlightState {
  /** The day's one main task ("eat the frog" / Make Time's Highlight); only today's is kept. */
  date: LocalDateString | null;
  taskId: string | null;
  hydrate: () => Promise<void>;
  /** Sets (or, for the same task, clears) today's main task. */
  toggle: (date: LocalDateString, taskId: string) => void;
}

export const useHighlightStore = create<HighlightState>((set, get) => ({
  date: null,
  taskId: null,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === 'object') {
        const { date, taskId } = parsed as Record<string, unknown>;
        if (typeof date === 'string' && typeof taskId === 'string') set({ date, taskId });
      }
    } catch {
      // No highlight is fine.
    }
  },

  toggle: (date, taskId) => {
    const same = get().date === date && get().taskId === taskId;
    const next = same ? { date: null, taskId: null } : { date, taskId };
    set(next);
    runDetached(AsyncStorage.setItem(KEY, JSON.stringify(next)));
  },
}));

/** Today's main task id, if one was picked today. */
export function highlightFor(state: Pick<HighlightState, 'date' | 'taskId'>, today: LocalDateString | null): string | null {
  return today && state.date === today ? state.taskId : null;
}
