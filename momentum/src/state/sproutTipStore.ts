import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { runDetached } from '@/core/errors';
import type { LocalDateString } from '@/core/localDate';

const KEY = 'momentum.sproutTip.v1';

interface SproutTipState {
  /** The day the sprout's tip was put away with "Got it" (it comes back the next day with a new one). */
  dismissedOn: LocalDateString | null;
  hydrate: () => Promise<void>;
  dismiss: (today: LocalDateString) => void;
  reopen: () => void;
}

export const useSproutTipStore = create<SproutTipState>((set) => ({
  dismissedOn: null,
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) set((s) => ({ dismissedOn: s.dismissedOn ?? raw }));
    } catch {
      // Shown.
    }
  },
  dismiss: (today) => {
    set({ dismissedOn: today });
    runDetached(AsyncStorage.setItem(KEY, today));
  },
  reopen: () => {
    set({ dismissedOn: null });
    runDetached(AsyncStorage.removeItem(KEY));
  },
}));
