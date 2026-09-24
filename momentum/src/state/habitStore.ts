import { create } from 'zustand';
import { runDetached, toErrorMessage } from '@/core/errors';
import type { LocalDateString } from '@/core/localDate';
import { repositories } from '@/data/repositories';
import { applyPrimaryAction, decrementProgress, progressOf, type LogProgress } from '@/domain/habitProgress';
import type { Habit, HabitLog, NewHabit } from '@/domain/models';
import { computeStreak } from '@/domain/streaks';
import { historyStart, reconcileStreakFreezes, statusesByHabit } from '@/services/streakService';
import { useSettingsStore } from './settingsStore';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

/** habitId → date → log. Plain records keep zustand updates cheap and immutable. */
export type LogIndex = Record<string, Record<LocalDateString, HabitLog>>;

interface HabitState {
  today: LocalDateString | null;
  habits: Habit[];
  logs: LogIndex;
  streaks: Record<string, number>;
  status: LoadStatus;
  /** Transient, user-facing error (e.g. a failed write that was rolled back). */
  error: string | null;
  lastForgivenDays: number;

  load: (today: LocalDateString) => Promise<void>;
  tapHabit: (habitId: string) => void;
  undoHabitStep: (habitId: string) => void;
  skipHabit: (habitId: string) => void;
  addHabit: (input: NewHabit) => Promise<void>;
  archiveHabit: (habitId: string) => Promise<void>;
  clearError: () => void;
}

function indexLogs(logs: readonly HabitLog[]): LogIndex {
  const index: LogIndex = {};
  for (const log of logs) {
    (index[log.habitId] ??= {})[log.logDate] = log;
  }
  return index;
}

function streakFor(habit: Habit, logs: LogIndex, today: LocalDateString): number {
  const statuses = statusesByHabit(Object.values(logs[habit.id] ?? {})).get(habit.id) ?? new Map();
  return computeStreak(habit, statuses, today);
}

function allStreaks(habits: readonly Habit[], logs: LogIndex, today: LocalDateString): Record<string, number> {
  return Object.fromEntries(habits.map((habit) => [habit.id, streakFor(habit, logs, today)]));
}

export const useHabitStore = create<HabitState>((set, get) => {
  /**
   * Optimistic write: state is updated synchronously (UI reacts on the same
   * frame), then persisted. A failed write rolls back to the previous log.
   */
  const commitProgress = (habitId: string, next: LogProgress): void => {
    const { today, logs, habits } = get();
    const habit = habits.find((h) => h.id === habitId);
    if (!today || !habit) return;

    const previous = logs[habitId]?.[today];
    const optimistic: HabitLog = {
      id: previous?.id ?? `pending-${habitId}-${today}`,
      habitId,
      logDate: today,
      currentCount: next.currentCount,
      status: next.status,
      updatedAt: new Date().toISOString(),
    };
    const nextLogs: LogIndex = { ...logs, [habitId]: { ...logs[habitId], [today]: optimistic } };
    set({ logs: nextLogs, streaks: { ...get().streaks, [habitId]: streakFor(habit, nextLogs, today) } });

    runDetached(
      repositories.habitLogs
        .upsert({ habitId, logDate: today, currentCount: next.currentCount, status: next.status })
        .then((saved) => {
          const current = get().logs[habitId]?.[today];
          if (current && current.id !== saved.id) {
            // Only swap in the real id; newer optimistic counts stay authoritative.
            set({ logs: { ...get().logs, [habitId]: { ...get().logs[habitId], [today]: { ...current, id: saved.id } } } });
          }
        }),
      (error) => {
        const rolledBack: LogIndex = { ...get().logs, [habitId]: { ...get().logs[habitId] } };
        const byDate = rolledBack[habitId];
        if (byDate) {
          if (previous) byDate[today] = previous;
          else delete byDate[today];
        }
        set({
          logs: rolledBack,
          streaks: { ...get().streaks, [habitId]: streakFor(habit, rolledBack, today) },
          error: `Couldn't save progress. ${toErrorMessage(error)}`,
        });
      },
    );
  };

  const currentProgress = (habitId: string): LogProgress | null => {
    const { today, logs } = get();
    return today ? progressOf(logs[habitId]?.[today]) : null;
  };

  return {
    today: null,
    habits: [],
    logs: {},
    streaks: {},
    status: 'idle',
    error: null,
    lastForgivenDays: 0,

    load: async (today) => {
      // Keep existing data visible during refreshes (e.g. midnight rollover).
      set({ status: get().habits.length > 0 ? get().status : 'loading', today });
      try {
        const habits = await repositories.habits.getAll();
        const reconcile = await reconcileStreakFreezes(habits, today);
        useSettingsStore.getState().setFreezesAvailable(reconcile.freezesRemaining);
        const logs = indexLogs(await repositories.habitLogs.getInRange(historyStart(today), today));
        if (get().today !== today) return; // a newer load superseded this one
        set({
          habits,
          logs,
          streaks: allStreaks(habits, logs, today),
          status: 'ready',
          error: null,
          lastForgivenDays: reconcile.forgivenDays,
        });
      } catch (error) {
        set({ status: 'error', error: toErrorMessage(error) });
      }
    },

    tapHabit: (habitId) => {
      const habit = get().habits.find((h) => h.id === habitId);
      const progress = currentProgress(habitId);
      if (habit && progress) commitProgress(habitId, applyPrimaryAction(habit, progress));
    },

    undoHabitStep: (habitId) => {
      const habit = get().habits.find((h) => h.id === habitId);
      const progress = currentProgress(habitId);
      if (!habit || !progress) return;
      commitProgress(
        habitId,
        habit.isQuantitative ? decrementProgress(habit, progress) : { currentCount: 0, status: 'in_progress' },
      );
    },

    skipHabit: (habitId) => {
      const progress = currentProgress(habitId);
      if (!progress) return;
      commitProgress(
        habitId,
        progress.status === 'skipped'
          ? { currentCount: progress.currentCount, status: 'in_progress' }
          : { currentCount: progress.currentCount, status: 'skipped' },
      );
    },

    addHabit: async (input) => {
      const habit = await repositories.habits.create(input);
      const { today, logs } = get();
      set({
        habits: [...get().habits, habit],
        streaks: { ...get().streaks, [habit.id]: today ? streakFor(habit, logs, today) : 0 },
      });
    },

    archiveHabit: async (habitId) => {
      const before = get().habits;
      set({ habits: before.filter((h) => h.id !== habitId) });
      try {
        await repositories.habits.setArchived(habitId, true);
      } catch (error) {
        set({ habits: before, error: `Couldn't archive habit. ${toErrorMessage(error)}` });
      }
    },

    clearError: () => set({ error: null }),
  };
});
