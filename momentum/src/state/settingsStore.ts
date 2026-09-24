import { create } from 'zustand';
import { toErrorMessage } from '@/core/errors';
import { inTransaction, repositories } from '@/data/repositories';
import type { AppSettings, NewHabit } from '@/domain/models';
import { cancelReflectionReminder, scheduleReflectionReminder } from '@/services/notifications';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface SettingsState {
  settings: AppSettings | null;
  status: LoadStatus;
  error: string | null;
  load: () => Promise<void>;
  /** Batch-inserts the chosen habits and flips the onboarding flag atomically. */
  completeOnboarding: (habits: readonly NewHabit[]) => Promise<void>;
  setFreezesAvailable: (count: number) => void;
  /**
   * Saves the reminder time (minutes after midnight, null = off) and
   * reschedules the notification. Returns false if notifications are blocked.
   */
  setReflectionReminder: (minutes: number | null) => Promise<boolean>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  status: 'idle',
  error: null,

  load: async () => {
    set({ status: 'loading', error: null });
    try {
      const settings = await repositories.settings.get();
      set({ settings, status: 'ready' });
    } catch (error) {
      set({ status: 'error', error: toErrorMessage(error) });
    }
  },

  completeOnboarding: async (habits) => {
    await inTransaction('onboarding.complete', async (repos) => {
      await repos.habits.createMany(habits);
      await repos.settings.setOnboardingCompleted(true);
    });
    const current = get().settings;
    if (current) set({ settings: { ...current, isOnboardingCompleted: true } });
  },

  setReflectionReminder: async (minutes) => {
    await repositories.settings.setReflectionReminder(minutes);
    const current = get().settings;
    if (current) set({ settings: { ...current, reflectionReminderMinutes: minutes } });
    if (minutes === null) {
      await cancelReflectionReminder();
      return true;
    }
    return scheduleReflectionReminder(Math.floor(minutes / 60), minutes % 60);
  },

  setFreezesAvailable: (count) => {
    const current = get().settings;
    if (current) set({ settings: { ...current, streakFreezesAvailable: count } });
  },
}));
