import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { runDetached } from '@/core/errors';
import type { LocalDateString } from '@/core/localDate';

const KEY = 'momentum.closedToday.v1';

interface DayCloseState {
  date: LocalDateString | null;
  /** Habits put away for today with "I didn't do it today". */
  ids: string[];
  hydrate: () => Promise<void>;
  isClosed: (habitId: string, today: LocalDateString) => boolean;
  close: (habitId: string, today: LocalDateString) => void;
  reopen: (habitId: string, today: LocalDateString) => void;
}

/**
 * "I didn't do it today": the habit leaves the open list for the rest of the day (per device).
 * It changes nothing in the history: an undone day is simply not done, as before.
 */
export const useDayCloseStore = create<DayCloseState>((set, get) => {
  const persist = () => runDetached(AsyncStorage.setItem(KEY, JSON.stringify({ date: get().date, ids: get().ids })));
  const idsFor = (today: LocalDateString) => (get().date === today ? get().ids : []);
  return {
    date: null,
    ids: [],
    hydrate: async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        if (parsed && typeof parsed === 'object') {
          const { date, ids } = parsed as { date?: unknown; ids?: unknown };
          if (typeof date === 'string' && Array.isArray(ids) && get().date === null) {
            set({ date, ids: ids.filter((id): id is string => typeof id === 'string') });
          }
        }
      } catch {
        // Nothing closed.
      }
    },
    isClosed: (habitId, today) => idsFor(today).includes(habitId),
    close: (habitId, today) => {
      const ids = idsFor(today);
      if (ids.includes(habitId)) return;
      set({ date: today, ids: [...ids, habitId] });
      persist();
    },
    reopen: (habitId, today) => {
      set({ date: today, ids: idsFor(today).filter((id) => id !== habitId) });
      persist();
    },
  };
});
