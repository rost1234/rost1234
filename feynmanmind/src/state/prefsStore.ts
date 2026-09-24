import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { storage } from '@/lib/storage';

export type LanguagePref = 'auto' | 'en' | 'he';
export type ThemePref = 'auto' | 'light' | 'dark';

interface PrefsState {
  language: LanguagePref;
  theme: ThemePref;
  onboardingDone: boolean;
  remindersEnabled: boolean;
  /** Local hour (0–23) for the daily review reminder. */
  reminderHour: number;
  /** Cards per generation request. */
  defaultCardCount: number;
  set: (patch: Partial<Omit<PrefsState, 'set'>>) => void;
}

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      language: 'auto',
      theme: 'auto',
      onboardingDone: false,
      remindersEnabled: false,
      reminderHour: 19,
      defaultCardCount: 15,
      set: (patch) => set(patch),
    }),
    {
      name: 'feynmanmind.prefs',
      version: 1,
      storage: createJSONStorage(() => storage),
      partialize: ({ set: _set, ...rest }) => rest,
    },
  ),
);

/** True once saved preferences are loaded (immediate with synchronous storage). */
export function usePrefsHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => usePrefsStore.persist.onFinishHydration(onChange),
    () => usePrefsStore.persist.hasHydrated(),
  );
}
