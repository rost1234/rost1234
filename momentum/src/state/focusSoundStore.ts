import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { runDetached } from '@/core/errors';
import { FOCUS_SOUNDS, VOLUME_LEVELS, type FocusSoundId } from '@/features/focus/sounds';

const KEY = 'momentum.focusSound.v1';

interface FocusSoundState {
  soundId: FocusSoundId;
  volume: number;
  hydrate: () => Promise<void>;
  setSound: (id: FocusSoundId) => void;
  setVolume: (volume: number) => void;
}

const isSoundId = (v: unknown): v is FocusSoundId => v === 'off' || FOCUS_SOUNDS.some((s) => s.id === v);

/** The user's preferred focus sound, remembered between sessions. */
export const useFocusSoundStore = create<FocusSoundState>((set, get) => {
  const persist = () => runDetached(AsyncStorage.setItem(KEY, JSON.stringify({ soundId: get().soundId, volume: get().volume })));
  return {
    soundId: 'off',
    volume: VOLUME_LEVELS[1].value,

    hydrate: async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (!raw) return;
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== 'object' || parsed === null) return;
        const { soundId, volume } = parsed as Record<string, unknown>;
        set({
          soundId: isSoundId(soundId) ? soundId : 'off',
          volume: typeof volume === 'number' && volume >= 0 && volume <= 1 ? volume : get().volume,
        });
      } catch {
        // Preferences are a convenience; defaults are fine.
      }
    },

    setSound: (soundId) => {
      set({ soundId });
      persist();
    },

    setVolume: (volume) => {
      set({ volume });
      persist();
    },
  };
});
