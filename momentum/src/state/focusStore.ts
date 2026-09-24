import { create } from 'zustand';
import { toErrorMessage } from '@/core/errors';
import { repositories } from '@/data/repositories';
import {
  computeSnapshot,
  createTimer,
  focusedMinutes,
  pauseTimer,
  projectedEndDate,
  resumeTimer,
  type PersistedTimer,
} from '@/domain/focusTimer';
import type { FocusSession } from '@/domain/models';
import {
  cancelNotification,
  scheduleFocusCompleteNotification,
} from '@/services/notifications';
import { clearTimer, loadTimer, saveTimer } from '@/services/timerStorage';

export interface FocusLink {
  habitId: string | null;
  taskId: string | null;
}

interface FocusState {
  timer: PersistedTimer | null;
  isHydrated: boolean;
  /** Most recently logged session, for the completion summary. */
  lastSession: FocusSession | null;
  error: string | null;

  hydrate: () => Promise<void>;
  start: (minutes: number, link: FocusLink) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  cancel: () => Promise<void>;
  /** Ends the session (early or on time) and logs it to SQLite. */
  finish: () => Promise<void>;
  dismissSummary: () => void;
}

let finishing = false;

export const useFocusStore = create<FocusState>((set, get) => {
  const persist = async (timer: PersistedTimer): Promise<void> => {
    set({ timer });
    await saveTimer(timer);
  };

  const withError = async (task: () => Promise<void>): Promise<void> => {
    try {
      await task();
    } catch (error) {
      set({ error: toErrorMessage(error) });
    }
  };

  return {
    timer: null,
    isHydrated: false,
    lastSession: null,
    error: null,

    hydrate: () =>
      withError(async () => {
        const timer = await loadTimer();
        set({ timer, isHydrated: true });
        // A session that ended while the app was closed is logged on resume.
        if (timer && computeSnapshot(timer).isFinished) await get().finish();
      }).finally(() => set({ isHydrated: true })),

    start: (minutes, link) =>
      withError(async () => {
        const previous = get().timer;
        if (previous) await cancelNotification(previous.notificationId);
        const timer = createTimer(minutes, link);
        await persist(timer); // persisted *before* scheduling: the clock is the source of truth
        const notificationId = await scheduleFocusCompleteNotification(projectedEndDate(timer), minutes);
        await persist({ ...timer, notificationId });
        set({ lastSession: null, error: null });
      }),

    pause: () =>
      withError(async () => {
        const timer = get().timer;
        if (!timer || timer.pausedAt) return;
        await persist({ ...pauseTimer(timer), notificationId: null });
        await cancelNotification(timer.notificationId);
      }),

    resume: () =>
      withError(async () => {
        const timer = get().timer;
        if (!timer || !timer.pausedAt) return;
        const resumed = resumeTimer(timer);
        await persist(resumed);
        const notificationId = await scheduleFocusCompleteNotification(
          projectedEndDate(resumed),
          resumed.targetDurationMinutes,
        );
        await persist({ ...resumed, notificationId });
      }),

    cancel: () =>
      withError(async () => {
        const timer = get().timer;
        set({ timer: null });
        await clearTimer();
        if (timer) await cancelNotification(timer.notificationId);
      }),

    finish: async () => {
      const timer = get().timer;
      if (!timer || finishing) return;
      finishing = true;
      try {
        const snapshot = computeSnapshot(timer);
        const minutes = focusedMinutes(snapshot);
        // Clear first so a crash mid-write can never double-log the session.
        set({ timer: null });
        await clearTimer();

        let session: FocusSession | null = null;
        if (minutes > 0) {
          const endTime = new Date(new Date(timer.startTime).getTime() + timer.pausedAccumulatedMs + snapshot.elapsedSeconds * 1000);
          session = await repositories.focusSessions.create({
            habitId: timer.habitId,
            taskId: timer.taskId,
            startTime: timer.startTime,
            endTime: endTime.toISOString(),
            durationMinutes: minutes,
          });
        }

        // On-time finishes are announced by the already-scheduled notification
        // (it fires even when backgrounded); early finishes cancel it.
        if (!snapshot.isFinished) await cancelNotification(timer.notificationId);
        set({ lastSession: session, error: null });
      } catch (error) {
        set({ error: `Couldn't log focus session. ${toErrorMessage(error)}` });
      } finally {
        finishing = false;
      }
    },

    dismissSummary: () => set({ lastSession: null }),
  };
});
