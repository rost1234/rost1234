import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { runDetached } from '@/core/errors';
import type { Weekday } from '@/core/localDate';

export type ThemePref = 'system' | 'light' | 'dark';
export type LanguagePref = 'auto' | 'en' | 'he';
/** "calm" is the regular look; "garden" has a sprout that grows with every habit done. */
export type LookPref = 'calm' | 'garden';

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
  look: LookPref;
  isHydrated: boolean;
  setDayOff: (changes: Partial<DayOffSettings>) => void;
  hydrate: () => Promise<void>;
  setTheme: (theme: ThemePref) => void;
  setLanguage: (language: LanguagePref) => void;
  setLook: (look: LookPref) => void;
}

const isTheme = (v: unknown): v is ThemePref => v === 'system' || v === 'light' || v === 'dark';
const isLook = (v: unknown): v is LookPref => v === 'calm' || v === 'garden';
const isLanguage = (v: unknown): v is LanguagePref => v === 'auto' || v === 'en' || v === 'he';
const isWeekdays = (v: unknown): v is Weekday[] =>
  Array.isArray(v) && v.every((d) => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6);

/** Appearance preferences (per device, not part of the habit data). */
export const usePrefsStore = create<PrefsState>((set, get) => {
  const persist = () => {
    const { theme, language, look, dayOffMode, weekendDays, holidays } = get();
    runDetached(AsyncStorage.setItem(KEY, JSON.stringify({ theme, language, look, dayOffMode, weekendDays, holidays })));
  };
  return {
    theme: 'system',
    language: 'auto',
    look: 'calm',
    dayOffMode: true,
    weekendDays: null,
    holidays: null,
    isHydrated: false,

    hydrate: async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        if (parsed && typeof parsed === 'object') {
          const { theme, language, look, dayOffMode, weekendDays, holidays } = parsed as Record<string, unknown>;
          set({
            theme: isTheme(theme) ? theme : 'system',
            language: isLanguage(language) ? language : 'auto',
            look: isLook(look) ? look : 'calm',
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

    setLook: (look) => {
      set({ look });
      persist();
    },

    setDayOff: (changes) => {
      set(changes);
      persist();
    },
  };
});
