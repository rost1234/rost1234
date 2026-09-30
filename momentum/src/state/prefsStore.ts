import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { runDetached } from '@/core/errors';
import type { Weekday } from '@/core/localDate';

export type ThemePref = 'system' | 'light' | 'dark';
export type LanguagePref = 'auto' | 'en' | 'he';

const KEY = 'momentum.prefs.v1';

/** Home switches to a lighter layout on days off (weekends, holidays, vacation). */
export interface DayOffSettings {
  dayOffMode: boolean;
  /** `null` = the default for the language (Fri–Sat in Hebrew, Sat–Sun otherwise). */
  weekendDays: Weekday[] | null;
  /** Null until chosen: on in Hebrew, off in English. */
  holidays: boolean | null;
}

interface PrefsState extends DayOffSettings {
  theme: ThemePref;
  language: LanguagePref;
  isHydrated: boolean;
  setDayOff: (changes: Partial<DayOffSettings>) => void;
  hydrate: () => Promise<void>;
  setTheme: (theme: ThemePref) => void;
  setLanguage: (language: LanguagePref) => void;
}

const isTheme = (v: unknown): v is ThemePref => v === 'system' || v === 'light' || v === 'dark';
const isLanguage = (v: unknown): v is LanguagePref => v === 'auto' || v === 'en' || v === 'he';
const isWeekdays = (v: unknown): v is Weekday[] =>
  Array.isArray(v) && v.every((d) => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6);

/** Appearance preferences (per device, not part of the habit data). */
export const usePrefsStore = create<PrefsState>((set, get) => {
  const persist = () => {
    const { theme, language, dayOffMode, weekendDays, holidays } = get();
    runDetached(AsyncStorage.setItem(KEY, JSON.stringify({ theme, language, dayOffMode, weekendDays, holidays })));
  };
  return {
    theme: 'system',
    language: 'auto',
    dayOffMode: true,
    weekendDays: null,
    holidays: null,
    isHydrated: false,

    hydrate: async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        if (parsed && typeof parsed === 'object') {
          const { theme, language, dayOffMode, weekendDays, holidays } = parsed as Record<string, unknown>;
          set({
            theme: isTheme(theme) ? theme : 'system',
            language: isLanguage(language) ? language : 'auto',
            dayOffMode: typeof dayOffMode === 'boolean' ? dayOffMode : true,
            weekendDays: isWeekdays(weekendDays) ? weekendDays : null,
            holidays: typeof holidays === 'boolean' ? holidays : null,
          });
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

    setDayOff: (changes) => {
      set(changes);
      persist();
    },
  };
});
