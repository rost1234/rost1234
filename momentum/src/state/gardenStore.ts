import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { runDetached } from '@/core/errors';
import type { LocalDateString } from '@/core/localDate';
import type { GrowthStage, VisitorId } from '@/domain/garden';

/** Also the record of which stages were already celebrated. */
const KEY = 'momentum.garden.v1';

export const SPROUT_NAME_MAX = 16;

interface GardenState {
  /** The highest stage the sprout ever reached (-1 until known). It never goes down. */
  reached: number;
  /** A name the sprout was given (empty = none). */
  name: string;
  /** Visitors who came to the garden, and the day each one first came. */
  visitors: Partial<Record<VisitorId, LocalDateString>>;
  /** The day the seed was planted at the end of onboarding (null on older installs). */
  plantedOn: LocalDateString | null;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  /** Records a stage if it's higher than before; true when it was. */
  raise: (stage: GrowthStage) => Promise<boolean>;
  setName: (name: string) => void;
  /** Records visitors that came today for the first time; returns those that are new. */
  welcome: (ids: readonly VisitorId[], today: LocalDateString) => VisitorId[];
  plant: (today: LocalDateString) => void;
}

let hydrating: Promise<void> | null = null;

const isDate = (v: unknown): v is LocalDateString => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** The Garden sprout's high-water mark, name and visitors (per device, like the look itself). */
export const useGardenStore = create<GardenState>((set, get) => {
  const persist = () => {
    const { reached, name, visitors, plantedOn } = get();
    runDetached(AsyncStorage.setItem(KEY, JSON.stringify({ stage: reached, name, visitors, plantedOn })));
  };

  return {
    reached: -1,
    name: '',
    visitors: {},
    plantedOn: null,
    isHydrated: false,

    hydrate: () => {
      hydrating ??= (async () => {
        try {
          const raw = await AsyncStorage.getItem(KEY);
          const parsed: unknown = raw ? JSON.parse(raw) : null;
          if (parsed && typeof parsed === 'object') {
            const { stage, name, visitors, plantedOn } = parsed as Record<string, unknown>;
            if (typeof stage === 'number' && Number.isFinite(stage)) set({ reached: Math.max(get().reached, stage) });
            if (typeof name === 'string') set({ name: name.slice(0, SPROUT_NAME_MAX) });
            if (visitors && typeof visitors === 'object') {
              const kept = Object.fromEntries(Object.entries(visitors).filter(([, date]) => isDate(date)));
              set({ visitors: { ...kept, ...get().visitors } });
            }
            if (isDate(plantedOn)) set({ plantedOn });
          }
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
      persist();
      return true;
    },

    setName: (name) => {
      set({ name: name.trim().slice(0, SPROUT_NAME_MAX) });
      persist();
    },

    welcome: (ids, today) => {
      if (!get().isHydrated) return [];
      const known = get().visitors;
      const fresh = ids.filter((id) => !known[id]);
      if (fresh.length === 0) return [];
      set({ visitors: { ...known, ...Object.fromEntries(fresh.map((id) => [id, today])) } });
      persist();
      return fresh;
    },

    plant: (today) => {
      set({ plantedOn: today });
      persist();
    },
  };
});
