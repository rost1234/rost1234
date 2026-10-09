import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { storage } from '@/lib/storage';

export type LanguagePref = 'auto' | 'en' | 'he';
export type ThemePref = 'auto' | 'light' | 'dark';
export type TextSizePref = 'normal' | 'large' | 'xlarge';
export type ReviewOrder = 'due' | 'hardest';

interface PrefsState {
  language: LanguagePref;
  theme: ThemePref;
  onboardingDone: boolean;
  remindersEnabled: boolean;
  /** Local hour (0–23) for the daily review reminder. */
  reminderHour: number;
  /** Cards per generation request. */
  defaultCardCount: number;
  /** AI server (Supabase project URL) and its public key, set in Settings. Empty = use build-time values. */
  aiUrl: string;
  aiKey: string;
  /** Daily study goal in minutes (the "Today" ring). */
  dailyGoalMinutes: number;
  /** New (never reviewed) cards per day. */
  newCardsPerDay: number;
  /** Reviews per day, new cards included. */
  maxReviewsPerDay: number;
  reviewOrder: ReviewOrder;
  textSize: TextSizePref;
  highContrast: boolean;
  reduceMotion: boolean;
  hapticsEnabled: boolean;
  /** The last printed-kit settings (see src/print). */
  printCourses: string[];
  printDays: number[];
  printPerDay: number;
  printMode: 'full' | 'saver' | 'max' | 'track';
  printColor: boolean;
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
      aiUrl: '',
      aiKey: '',
      dailyGoalMinutes: 20,
      newCardsPerDay: 20,
      maxReviewsPerDay: 200,
      reviewOrder: 'due',
      textSize: 'normal',
      highContrast: false,
      reduceMotion: false,
      hapticsEnabled: true,
      printCourses: [],
      printDays: [0, 1, 2, 3, 4],
      printPerDay: 1,
      printMode: 'saver',
      printColor: true,
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

/** True once a persisted zustand store has loaded (immediate with synchronous storage). */
export function useHydrated(store: { persist: { hasHydrated: () => boolean; onFinishHydration: (fn: () => void) => () => void } }): boolean {
  return useSyncExternalStore(
    (onChange) => store.persist.onFinishHydration(onChange),
    () => store.persist.hasHydrated(),
  );
}
