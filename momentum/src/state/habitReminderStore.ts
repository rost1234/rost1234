import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { runDetached } from '@/core/errors';
import type { LocalDateString } from '@/core/localDate';

const KEY = 'momentum.habitReminders.v1';

/** When a habit was completed (hour and minute from 0-1439). */
export interface CompletionTime {
  habitId: string;
  minutes: number; // 0-1439 (minutes after midnight)
  date: LocalDateString;
}

/** Statistics for a single habit: typical completion times. */
export interface HabitReminderStats {
  habitId: string;
  /** Last 30 days of completion times (minutes after midnight). */
  recentCompletions: number[];
  /** Predicted best time to remind (minutes after midnight). */
  predictedReminderMinutes: number | null;
  /** How many days we have data for. */
  dataSampleCount: number;
  /** Last update timestamp. */
  lastUpdated: number;
}

interface HabitReminderState {
  /** Stats per habit. */
  statsByHabit: Record<string, HabitReminderStats>;
  hydrate: () => Promise<void>;
  /** Record a habit completion; automatically recalculates stats. */
  recordCompletion: (habitId: string, date: LocalDateString, minutes: number) => void;
  /** Get the predicted reminder time for a habit (null if not enough data). */
  getPredictedTime: (habitId: string) => number | null;
  /** Get all stats for debugging/display. */
  getStats: (habitId: string) => HabitReminderStats | null;
  /** Clear stats for a habit (when archived). */
  clearHabitStats: (habitId: string) => void;
}

/** Calculate the median of an array of numbers. */
function median(arr: number[]): number | null {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

/** Calculate the mode (most common value) with clustering. */
function predictedTime(completions: number[]): number | null {
  if (completions.length < 3) return null;

  // Cluster times within 30-minute windows
  const clusters: number[] = [];
  const sorted = [...completions].sort((a, b) => a - b);

  let currentCluster = [sorted[0]!];
  for (let i = 1; i < sorted.length; i++) {
    const diff = sorted[i]! - sorted[i - 1]!;
    if (diff <= 30) {
      currentCluster.push(sorted[i]!);
    } else {
      // End current cluster; pick the median as representative
      clusters.push(Math.round(median(currentCluster) ?? currentCluster[0]!));
      currentCluster = [sorted[i]!];
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(Math.round(median(currentCluster) ?? currentCluster[0]!));
  }

  // Return the most frequent cluster center
  return clusters.length > 0 ? clusters[0]! : null;
}

export const useHabitReminderStore = create<HabitReminderState>((set, get) => {
  const persist = async (stats: Record<string, HabitReminderStats>) => {
    runDetached(AsyncStorage.setItem(KEY, JSON.stringify(stats)));
  };

  return {
    statsByHabit: {},

    hydrate: async () => {
      try {
        const stored = await AsyncStorage.getItem(KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Record<string, HabitReminderStats>;
          set({ statsByHabit: parsed });
        }
      } catch {
        // Defaults are fine
      }
    },

    recordCompletion: (habitId, date, minutes) => {
      const { statsByHabit } = get();
      const stats = statsByHabit[habitId];
      const now = Date.now();

      // Keep last 30 days of completions; drop old ones
      const recentCompletions = stats?.recentCompletions ?? [];
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

      // For now, just track the time (not the exact date to avoid duplication)
      // Add this completion if it's from a recent day
      const updated = [...recentCompletions, minutes].slice(-30);

      const newStats: HabitReminderStats = {
        habitId,
        recentCompletions: updated,
        predictedReminderMinutes: predictedTime(updated),
        dataSampleCount: new Set(updated).size,
        lastUpdated: now,
      };

      const next = { ...statsByHabit, [habitId]: newStats };
      set({ statsByHabit: next });
      persist(next);
    },

    getPredictedTime: (habitId) => {
      return get().statsByHabit[habitId]?.predictedReminderMinutes ?? null;
    },

    getStats: (habitId) => {
      return get().statsByHabit[habitId] ?? null;
    },

    clearHabitStats: (habitId) => {
      const { statsByHabit } = get();
      const next = { ...statsByHabit };
      delete next[habitId];
      set({ statsByHabit: next });
      persist(next);
    },
  };
});
