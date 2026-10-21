import { create } from 'zustand';
import { runDetached, toErrorMessage } from '@/core/errors';
import type { LocalDateString } from '@/core/localDate';
import { inTransaction, repositories } from '@/data/repositories';
import { applyPrimaryAction, decrementProgress, progressOf, reevaluateProgress, smallStep, type LogProgress } from '@/domain/habitProgress';
import type { Habit, HabitLog, NewHabit } from '@/domain/models';
import { applyDayEdit } from '@/domain/calendar';
import { applyPauses } from '@/domain/pauses';
import { isHabitDueOn } from '@/domain/habitSchedule';
import { computeStreak, restDaysLeft } from '@/domain/streaks';
import { MAX_STREAK_FREEZES, refundsFreeze } from '@/domain/freezeRewards';
import { offerMomentLater } from '@/services/sproutMoments';
import { historyStart, reconcileStreakFreezes, statusesByHabit } from '@/services/streakService';
import { refreshTodayWidget } from '@/widget/refreshWidget';
import { usePlanningStore } from './planningStore';
import { useSettingsStore } from './settingsStore';
import { t } from '@/i18n';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

/** "habitId:date" keys being completed after the fact (see `completeOnDate`). */
const completingPast = new Set<string>();

/** habitId → date → log. Plain records keep zustand updates cheap and immutable. */
export type LogIndex = Record<string, Record<LocalDateString, HabitLog>>;

interface HabitState {
  today: LocalDateString | null;
  habits: Habit[];
  logs: LogIndex;
  streaks: Record<string, number>;
  /** habitId → days completed before today (all history); today's log adds the rest. */
  completedBefore: Record<string, number>;
  /** Days before today with at least one habit completed (the Garden sprout grows with these). */
  completedDaysBefore: number;
  status: LoadStatus;
  /** Transient, user-facing error (e.g. a failed write that was rolled back). */
  error: string | null;
  lastForgivenDays: number;
  lastFreezeAwarded: boolean;
  /** Most recent user change, so it can be undone from a toast. */
  lastChange: LastChange | null;

  load: (today: LocalDateString) => Promise<void>;
  tapHabit: (habitId: string) => void;
  undoHabitStep: (habitId: string) => void;
  /** A rest day for today (or takes it back); refused when the week's rest days are used. */
  skipHabit: (habitId: string) => void;
  /** Rest days this habit can still take today (2 in any 7 days). */
  restDaysLeft: (habitId: string) => number;
  /** Today's mark set directly (an amount, "in part"), with Undo. */
  setTodayProgress: (habitId: string, next: LogProgress) => void;
  /** Marks a past day done ("done yesterday too"); a freeze spent on that day comes back. */
  completeOnDate: (habitId: string, date: LocalDateString) => Promise<void>;
  /** Sets what a habit holds on `date` (today or earlier), e.g. from the calendar; a freeze spent on that day comes back when it becomes done. Resolves true when a freeze came back. */
  setProgressOnDate: (habitId: string, date: LocalDateString, next: LogProgress) => Promise<boolean>;
  /** Saves a new habit and marks it as just added (Today highlights it once). */
  addHabit: (input: NewHabit) => Promise<Habit>;
  /** Deletes a habit that was added a moment ago (the "Undo" right after adding). */
  removeNewHabit: (habitId: string) => Promise<void>;
  /** The habit added most recently in this session, until Today has shown it. */
  justAdded: string | null;
  clearJustAdded: () => void;
  /** Saves edits; today's log is re-evaluated against a changed target. Streak history is kept. */
  updateHabit: (habitId: string, changes: Partial<NewHabit>) => Promise<void>;
  archiveHabit: (habitId: string) => Promise<void>;
  /** Brings an archived habit back to Today, history and all. */
  restoreHabit: (habitId: string) => Promise<void>;
  clearError: () => void;
  /** Restores the habit's state from before `lastChange`. */
  undoLast: () => void;
  dismissLastChange: () => void;
}

export interface LastChange {
  habitId: string;
  previous: LogProgress;
  /** What happened, for the toast ("Done", "+1", "Skipped"…). */
  label: string;
  /** Unique per change so the toast restarts its timer. */
  at: number;
}

function describeChange(before: LogProgress, after: LogProgress, unit: string, nth: number, binary: boolean): string {
  if (after.status === 'skipped') return t('undo.skipped');
  // The path so far: every completion is one more small choice.
  if (after.status === 'completed' && before.status !== 'completed') return nth > 1 ? t('undo.doneNth', { count: nth }) : t('undo.done');
  if (binary && after.status === 'in_progress' && after.currentCount > 0) return t('undo.partial');
  if (after.currentCount === before.currentCount + 1) return t('undo.plusOne', { unit }).trim();
  if (after.currentCount > before.currentCount) return t('undo.amount', { count: after.currentCount, unit }).trim();
  // The amount set lower (but not to zero) with the stepper: say where it is now.
  if (after.currentCount < before.currentCount && after.currentCount > 0 && !binary) return t('undo.amount', { count: after.currentCount, unit }).trim();
  if (after.currentCount < before.currentCount || before.status === 'completed') return t('undo.undone');
  return t('undo.updated');
}

/** The first habit stacked right after `habitId` that is due today and not done yet. */
export function nextInChain(habits: readonly Habit[], logs: LogIndex, habitId: string, today: LocalDateString): Habit | undefined {
  return habits.find((h) => {
    if (h.afterHabitId !== habitId || h.id === habitId || !isHabitDueOn(h, today)) return false;
    const status = logs[h.id]?.[today]?.status;
    return status !== 'completed' && status !== 'skipped';
  });
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
  // Planned pauses (vacation / sick) count as neutral days.
  return computeStreak(habit, applyPauses(statuses, usePlanningStore.getState().pauses, today, habit.id), today);
}

function allStreaks(habits: readonly Habit[], logs: LogIndex, today: LocalDateString): Record<string, number> {
  return Object.fromEntries(habits.map((habit) => [habit.id, streakFor(habit, logs, today)]));
}

export const useHabitStore = create<HabitState>((set, get) => {
  /**
   * Optimistic write: state is updated synchronously (UI reacts on the same
   * frame), then persisted. A failed write rolls back to the previous log.
   */
  const commitProgress = (habitId: string, next: LogProgress, options: { recordUndo?: boolean } = {}): void => {
    const { today, logs, habits } = get();
    const habit = habits.find((h) => h.id === habitId);
    if (!today || !habit) return;

    const previous = logs[habitId]?.[today];
    if (options.recordUndo) {
      const before = progressOf(previous);
      const nth = (get().completedBefore[habitId] ?? 0) + 1;
      let label = t('undo.label', { title: habit.title, change: describeChange(before, next, habit.unit, nth, !habit.isQuantitative) });
      // Habit stacking: finishing the anchor names the habit that comes right after it.
      if (next.status === 'completed' && before.status !== 'completed') {
        const following = nextInChain(habits, logs, habitId, today);
        if (following) label = t('undo.withNext', { label, title: following.title });
      }
      set({ lastChange: { habitId, previous: before, label, at: Date.now() } });
    }
    const optimistic: HabitLog = {
      id: previous?.id ?? `pending-${habitId}-${today}`,
      habitId,
      logDate: today,
      currentCount: next.currentCount,
      status: next.status,
      updatedAt: new Date().toISOString(),
      source: 'app',
    };
    const nextLogs: LogIndex = { ...logs, [habitId]: { ...logs[habitId], [today]: optimistic } };
    set({ logs: nextLogs, streaks: { ...get().streaks, [habitId]: streakFor(habit, nextLogs, today) } });

    runDetached(
      repositories.habitLogs
        .upsert({ habitId, logDate: today, currentCount: next.currentCount, status: next.status })
        .then((saved) => {
          refreshTodayWidget();
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
          error: t('err.saveProgress', { error: toErrorMessage(error) }),
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
    completedBefore: {},
    completedDaysBefore: 0,
    status: 'idle',
    error: null,
    lastForgivenDays: 0,
    lastFreezeAwarded: false,
    lastChange: null,
    justAdded: null,

    load: async (today) => {
      // Keep existing data visible during refreshes (e.g. midnight rollover).
      set({ status: get().habits.length > 0 ? get().status : 'loading', today });
      try {
        const habits = await repositories.habits.getAll();
        await usePlanningStore.getState().load(today);
        const reconcile = await reconcileStreakFreezes(habits, today);
        useSettingsStore.getState().setFreezesAvailable(reconcile.freezesRemaining);
        const [logs, completedBefore, completedDaysBefore] = await Promise.all([
          repositories.habitLogs.getInRange(historyStart(today), today).then(indexLogs),
          repositories.habitLogs.countCompletedBefore(today).catch(() => ({})),
          repositories.habitLogs.countCompletedDaysBefore(today).catch(() => 0),
        ]);
        if (get().today !== today) return; // a newer load superseded this one
        set({
          habits,
          logs,
          streaks: allStreaks(habits, logs, today),
          completedBefore,
          completedDaysBefore,
          status: 'ready',
          error: null,
          lastForgivenDays: reconcile.forgivenDays,
          lastFreezeAwarded: reconcile.freezeAwarded,
        });
        refreshTodayWidget(0);
      } catch (error) {
        set({ status: 'error', error: toErrorMessage(error) });
      }
    },

    tapHabit: (habitId) => {
      const habit = get().habits.find((h) => h.id === habitId);
      const progress = currentProgress(habitId);
      if (!habit || !progress) return;
      // Low-energy day: the first tap is the small step (it keeps the streak); more taps go on as usual.
      const minimumDay = usePlanningStore.getState().dayMode === 'minimum';
      const next =
        minimumDay && progress.status !== 'completed' && progress.currentCount === 0 && !habit.isQuit
          ? smallStep(habit)
          : applyPrimaryAction(habit, progress);
      commitProgress(habitId, next, { recordUndo: true });
    },

    undoHabitStep: (habitId) => {
      const habit = get().habits.find((h) => h.id === habitId);
      const progress = currentProgress(habitId);
      if (!habit || !progress) return;
      commitProgress(
        habitId,
        habit.isQuantitative ? decrementProgress(habit, progress) : { currentCount: 0, status: 'in_progress' },
        { recordUndo: true },
      );
    },

    setTodayProgress: (habitId, next) => {
      const progress = currentProgress(habitId);
      if (!progress || (progress.status === next.status && progress.currentCount === next.currentCount)) return;
      commitProgress(habitId, next, { recordUndo: true });
    },

    skipHabit: (habitId) => {
      const habit = get().habits.find((h) => h.id === habitId);
      const progress = currentProgress(habitId);
      if (!progress || !habit) return;
      // A rest day is capped (two in any 7 days): a little slack helps, unlimited slack doesn't.
      if (progress.status !== 'skipped' && get().restDaysLeft(habitId) === 0) return;
      commitProgress(
        habitId,
        progress.status === 'skipped'
          ? // A yes/no habit comes back not done (a count of 1 would read as "done in part").
            { currentCount: habit.isQuantitative ? progress.currentCount : 0, status: 'in_progress' }
          : { currentCount: progress.currentCount, status: 'skipped' },
        { recordUndo: true },
      );
    },

    restDaysLeft: (habitId) => {
      const { today, logs, habits } = get();
      const habit = habits.find((h) => h.id === habitId);
      if (!today || !habit || habit.isQuit) return 0;
      const statuses = statusesByHabit(Object.values(logs[habitId] ?? {})).get(habitId) ?? new Map();
      return restDaysLeft(statuses, today);
    },

    completeOnDate: async (habitId, date) => {
      const { today, habits } = get();
      const habit = habits.find((h) => h.id === habitId);
      if (!today || !habit || date >= today) return;
      await get().setProgressOnDate(habitId, date, applyDayEdit(habit, { currentCount: 0, status: 'in_progress' }, 'done'));
    },

    setProgressOnDate: async (habitId, date, next) => {
      const { today, habits } = get();
      const habit = habits.find((h) => h.id === habitId);
      const key = `${habitId}:${date}`;
      // One write per habit/day at a time, so a double tap can't refund twice.
      if (!today || !habit || date > today || completingPast.has(key)) return false;
      completingPast.add(key);
      try {
        const previous = (await repositories.habitLogs.getForDate(date)).find((l) => l.habitId === habitId);
        if (previous?.status === next.status && previous.currentCount === next.currentCount) return false;
        // The log and the freeze refund commit together, or not at all.
        const balance = await inTransaction('habits.editDay', async (repos) => {
          await repos.habitLogs.upsert({ habitId, logDate: date, currentCount: next.currentCount, status: next.status });
          return refundsFreeze(previous?.status, next.status, date, today)
            ? repos.settings.refundStreakFreezes(1, MAX_STREAK_FREEZES)
            : null;
        });
        if (balance !== null) useSettingsStore.getState().setFreezesAvailable(balance);
        await get().load(today);
        return balance !== null;
      } finally {
        completingPast.delete(key);
      }
    },

    addHabit: async (input) => {
      const habit = await repositories.habits.create(input);
      const { today, logs } = get();
      refreshTodayWidget();
      set({
        habits: [...get().habits, habit],
        streaks: { ...get().streaks, [habit.id]: today ? streakFor(habit, logs, today) : 0 },
      });
      set({ justAdded: habit.id });
      // The Garden sprout has a study for a fresh start.
      offerMomentLater('newHabit', today ?? undefined);
      return habit;
    },

    removeNewHabit: async (habitId) => {
      const before = get().habits;
      set({ habits: before.filter((h) => h.id !== habitId), justAdded: get().justAdded === habitId ? null : get().justAdded });
      try {
        await repositories.habits.delete(habitId);
        refreshTodayWidget();
      } catch (error) {
        set({ habits: before, error: t('err.removeNew', { error: toErrorMessage(error) }) });
      }
    },

    clearJustAdded: () => set({ justAdded: null }),

    updateHabit: async (habitId, changes) => {
      const current = get().habits.find((h) => h.id === habitId);
      if (!current) return;
      await repositories.habits.update(habitId, changes);
      refreshTodayWidget();
      const merged = { ...current, ...changes };
      const updated = { ...merged, targetCount: merged.isQuantitative ? Math.max(1, merged.targetCount) : 1 };
      const { today, logs } = get();
      set({
        habits: get().habits.map((h) => (h.id === habitId ? updated : h)),
        streaks: { ...get().streaks, [habitId]: today ? streakFor(updated, logs, today) : 0 },
      });

      const log = today ? logs[habitId]?.[today] : undefined;
      if (!log) return;
      const next = reevaluateProgress(updated, progressOf(log));
      if (next.status !== log.status || next.currentCount !== log.currentCount) commitProgress(habitId, next);
    },

    archiveHabit: async (habitId) => {
      const before = get().habits;
      set({ habits: before.filter((h) => h.id !== habitId) });
      try {
        await repositories.habits.setArchived(habitId, true);
        refreshTodayWidget();
      } catch (error) {
        set({ habits: before, error: t('err.archive', { error: toErrorMessage(error) }) });
      }
    },

    restoreHabit: async (habitId) => {
      await repositories.habits.setArchived(habitId, false);
      refreshTodayWidget();
      const { today } = get();
      if (today) await get().load(today);
    },

    clearError: () => set({ error: null }),

    undoLast: () => {
      const change = get().lastChange;
      if (!change) return;
      set({ lastChange: null });
      commitProgress(change.habitId, change.previous);
    },

    dismissLastChange: () => set({ lastChange: null }),
  };
});
