import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { runDetached } from '@/core/errors';

const KEY = 'momentum.groups.v1';

interface GroupFoldState {
  /** Group name → open on Home. Closed unless opened (per device). */
  open: Record<string, boolean>;
  hydrate: () => Promise<void>;
  toggle: (name: string) => void;
}

/** Which habit groups are unfolded on Home. */
export const useGroupFoldStore = create<GroupFoldState>((set, get) => ({
  open: {},
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === 'object') {
        const open: Record<string, boolean> = {};
        for (const [name, value] of Object.entries(parsed as Record<string, unknown>)) if (value === true) open[name] = true;
        set({ open: { ...open, ...get().open } });
      }
    } catch {
      // All closed.
    }
  },
  toggle: (name) => {
    const open = { ...get().open };
    if (open[name]) delete open[name];
    else open[name] = true;
    set({ open });
    runDetached(AsyncStorage.setItem(KEY, JSON.stringify(open)));
  },
}));
