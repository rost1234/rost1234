import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { runDetached } from '@/core/errors';
import type { GrowthStage } from '@/domain/garden';

/** Also the record of which stages were already celebrated. */
const KEY = 'momentum.garden.v1';

interface GardenState {
  /** The highest stage the sprout ever reached (-1 until known). It never goes down. */
  reached: number;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  /** Records a stage if it's higher than before; true when it was. */
  raise: (stage: GrowthStage) => Promise<boolean>;
}

let hydrating: Promise<void> | null = null;

/** The Garden sprout's high-water mark (per device, like the look itself). */
export const useGardenStore = create<GardenState>((set, get) => ({
  reached: -1,
  isHydrated: false,

  hydrate: () => {
    hydrating ??= (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        const stage = parsed && typeof parsed === 'object' ? (parsed as { stage?: unknown }).stage : undefined;
        if (typeof stage === 'number' && Number.isFinite(stage)) set({ reached: Math.max(get().reached, stage) });
      } catch {
        // Unknown: the sprout shows what the history says.
      } finally {
        set({ isHydrated: true });
      }
    })();
    return hydrating;
  },

  raise: async (stage) => {
    await get().hydrate();
    if (stage <= get().reached) return false;
    set({ reached: stage });
    runDetached(AsyncStorage.setItem(KEY, JSON.stringify({ stage })));
    return true;
  },
}));
