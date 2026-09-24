import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { runDetached } from '@/core/errors';
import { DEFAULT_VOLUME, normalizeLayers, type SoundLayer } from '@/features/focus/soundLayers';
import { VOLUME_LEVELS, type FocusSoundId } from '@/features/focus/sounds';

const KEY = 'momentum.focusSound.v2';
/** v1 stored a single `{ soundId, volume }`. */
const LEGACY_KEY = 'momentum.focusSound.v1';

interface FocusSoundState {
  /** The mix: empty = silence, at most two layers, no duplicates. */
  layers: SoundLayer[];
  hydrate: () => Promise<void>;
  /** Replaces the main sound; `off` silences the whole mix. */
  setSound: (id: FocusSoundId) => void;
  /** Adds, replaces or (with `off`) removes the second layer. */
  setSecondLayer: (id: FocusSoundId) => void;
  setVolume: (index: number, volume: number) => void;
}

function parseStored(raw: string | null, legacy: string | null): SoundLayer[] | null {
  if (raw) return normalizeLayers(JSON.parse(raw));
  if (!legacy) return null;
  const { soundId, volume } = JSON.parse(legacy) as Record<string, unknown>;
  return normalizeLayers([{ id: soundId, volume }]);
}

/** The user's preferred focus sound mix, remembered between sessions. */
export const useFocusSoundStore = create<FocusSoundState>((set, get) => {
  const update = (layers: SoundLayer[]) => {
    set({ layers: normalizeLayers(layers) });
    runDetached(AsyncStorage.setItem(KEY, JSON.stringify(get().layers)));
  };
  return {
    layers: [],

    hydrate: async () => {
      try {
        const [raw, legacy] = await Promise.all([AsyncStorage.getItem(KEY), AsyncStorage.getItem(LEGACY_KEY)]);
        const layers = parseStored(raw, legacy);
        if (layers) set({ layers });
      } catch {
        // Preferences are a convenience; defaults are fine.
      }
    },

    setSound: (id) => {
      const [first, second] = get().layers;
      if (id === 'off') return update([]);
      update([{ id, volume: first?.volume ?? DEFAULT_VOLUME }, ...(second && second.id !== id ? [second] : [])]);
    },

    setSecondLayer: (id) => {
      const [first, second] = get().layers;
      if (!first) return;
      if (id === 'off') return update([first]);
      update([first, { id, volume: second?.volume ?? VOLUME_LEVELS[0].value }]);
    },

    setVolume: (index, volume) => update(get().layers.map((l, i) => (i === index ? { ...l, volume } : l))),
  };
});
