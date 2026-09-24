import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { runDetached } from '@/core/errors';

export type ThemePref = 'system' | 'light' | 'dark';
export type LanguagePref = 'auto' | 'en' | 'he';

const KEY = 'momentum.prefs.v1';

interface PrefsState {
  theme: ThemePref;
  language: LanguagePref;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setTheme: (theme: ThemePref) => void;
  setLanguage: (language: LanguagePref) => void;
}

const isTheme = (v: unknown): v is ThemePref => v === 'system' || v === 'light' || v === 'dark';
const isLanguage = (v: unknown): v is LanguagePref => v === 'auto' || v === 'en' || v === 'he';

/** Appearance preferences (per device, not part of the habit data). */
export const usePrefsStore = create<PrefsState>((set, get) => {
  const persist = () => runDetached(AsyncStorage.setItem(KEY, JSON.stringify({ theme: get().theme, language: get().language })));
  return {
    theme: 'system',
    language: 'auto',
    isHydrated: false,

    hydrate: async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        if (parsed && typeof parsed === 'object') {
          const { theme, language } = parsed as Record<string, unknown>;
          set({ theme: isTheme(theme) ? theme : 'system', language: isLanguage(language) ? language : 'auto' });
        }
      } catch {
        // Defaults are fine.
      } finally {
        set({ isHydrated: true });
      }
    },

    setTheme: (theme) => {
      set({ theme });
      persist();
    },

    setLanguage: (language) => {
      set({ language });
      persist();
    },
  };
});
