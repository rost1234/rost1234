import { create } from 'zustand';
import { toErrorMessage } from '@/core/errors';
import { repositories } from '@/data/repositories';
import { computeSnapshot, createTimer, focusedMinutes, pauseTimer, resumeTimer, type PersistedTimer } from '@/domain/focusTimer';
import { CLASSIC_POMODORO, advanceFinishedPhases, firstPhase } from '@/domain/pomodoro';
import { pauseFocusSound, playFocusMix, stopFocusSound } from '@/services/focusSoundPlayer';
import { cancelTimerNotifications, scheduleTimerNotifications } from '@/services/timerNotifications';
import { clearTimer, loadTimer, saveTimer } from '@/services/timerStorage';
import { refreshFocusWidget } from '@/widget/refreshWidget';
import { useFocusSoundStore } from './focusSoundStore';
import { t } from '@/i18n';

/** Plays the preferred focus sound (if any) — never lets audio errors break the timer. */
async function startPreferredSound(): Promise<void> {
  try {
    await playFocusMix(useFocusSoundStore.getState().layers);
  } catch {
    // Audio is optional.
  }
}

export interface FocusLink {
  habitId: string | null;
  taskId: string | null;
}

export interface FocusSummary {
  minutes: number;
  blocks: number;
}

interface FocusState {
  timer: PersistedTimer | null;
  isHydrated: boolean;
  /** What the last finished session logged, for the completion card. */
  lastSummary: FocusSummary | null;
  error: string | null;

  hydrate: () => Promise<void>;
  /** Picks up a session started elsewhere (the Focus widget) while the app was in the background. */
  syncFromStorage: () => Promise<void>;
  start: (minutes: number, link: FocusLink, options?: { pomodoro?: boolean }) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  cancel: () => Promise<void>;
  /** Ends the whole session now (early or on time) and logs focused time. */
  finish: () => Promise<void>;
  /** Called when the current phase ran out: rolls a Pomodoro forward or finishes. */
  onPhaseElapsed: () => Promise<void>;
  dismissSummary: () => void;
}

let busy = false;

/** The mix that is playing, as stored with each session ("rain+brown"); null = silence. */
function currentSoundId(): string | null {
  const ids = useFocusSoundStore.getState().layers.map((l) => l.id);
  return ids.length > 0 ? ids.join('+') : null;
}

interface WorkLog {
  startTime: string;
  endTime: string;
  minutes: number;
  targetMinutes: number;
  /** Ran to the planned end (for the sound experiment). */
  completed: boolean;
}

async function logWork(timer: PersistedTimer, work: WorkLog): Promise<void> {
  if (work.minutes <= 0) return;
  await repositories.focusSessions.create({
    habitId: timer.habitId,
    taskId: timer.taskId,
    startTime: work.startTime,
    endTime: work.endTime,
    durationMinutes: work.minutes,
    soundId: currentSoundId(),
    targetMinutes: work.targetMinutes,
    completed: work.completed,
  });
}

export const useFocusStore = create<FocusState>((set, get) => {
  const persist = async (timer: PersistedTimer): Promise<void> => {
    set({ timer });
    await saveTimer(timer);
    refreshFocusWidget();
  };

  const withError = async (task: () => Promise<void>): Promise<void> => {
    try {
      await task();
    } catch (error) {
      set({ error: toErrorMessage(error) });
    }
  };

  /** Clears the running timer first so a crash can never double-log. */
  const clearRunning = async (): Promise<void> => {
    set({ timer: null });
    stopFocusSound();
    await clearTimer();
    refreshFocusWidget();
  };

  /** Sound only plays during focus phases, not during Pomodoro breaks. */
  const syncSound = async (timer: PersistedTimer): Promise<void> => {
    if (timer.pausedAt) return;
    if (timer.pomodoro?.phase === 'break') pauseFocusSound();
    else await startPreferredSound();
  };

  return {
    timer: null,
    isHydrated: false,
    lastSummary: null,
    error: null,

    hydrate: () =>
      withError(async () => {
        const timer = await loadTimer();
        set({ timer, isHydrated: true });
        await useFocusSoundStore.getState().hydrate();
        // Anything that ended while the app was closed is logged / rolled forward now.
        if (timer && computeSnapshot(timer).isFinished) await get().onPhaseElapsed();
        else if (timer) await syncSound(timer);
      }).finally(() => set({ isHydrated: true })),

    syncFromStorage: async () => {
      if (busy || !get().isHydrated) return;
      const stored = await loadTimer();
      if (stored?.startTime !== get().timer?.startTime) await get().hydrate();
    },

    start: (minutes, link, options = {}) =>
      withError(async () => {
        const previous = get().timer;
        if (previous) await cancelTimerNotifications(previous);
        const base = options.pomodoro
          ? { ...createTimer(CLASSIC_POMODORO.workMinutes, link), pomodoro: firstPhase(CLASSIC_POMODORO) }
          : createTimer(minutes, link);
        await persist(base); // persisted *before* scheduling: the clock is the source of truth
        await persist({ ...base, ...(await scheduleTimerNotifications(base)) });
        set({ lastSummary: null, error: null });
        await startPreferredSound();
      }),

    pause: () =>
      withError(async () => {
        const timer = get().timer;
        if (!timer || timer.pausedAt) return;
        await persist({ ...pauseTimer(timer), notificationId: null, extraNotificationIds: [] });
        pauseFocusSound();
        await cancelTimerNotifications(timer);
      }),

    resume: () =>
      withError(async () => {
        const timer = get().timer;
        if (!timer || !timer.pausedAt) return;
        const resumed = resumeTimer(timer);
        await persist(resumed);
        // Re-reads the preference, so a sound picked while paused starts now.
        await syncSound(resumed);
        await persist({ ...resumed, ...(await scheduleTimerNotifications(resumed)) });
      }),

    cancel: () =>
      withError(async () => {
        const timer = get().timer;
        await clearRunning();
        if (timer) await cancelTimerNotifications(timer);
      }),

    finish: async () => {
      const timer = get().timer;
      if (!timer || busy) return;
      busy = true;
      try {
        const snapshot = computeSnapshot(timer);
        await clearRunning();
        // A Pomodoro break isn't focus time; any other phase logs what was done.
        const isBreak = timer.pomodoro?.phase === 'break';
        const minutes = isBreak ? 0 : focusedMinutes(snapshot);
        const endTime = new Date(new Date(timer.startTime).getTime() + timer.pausedAccumulatedMs + snapshot.elapsedSeconds * 1000);
        await logWork(timer, {
          startTime: timer.startTime,
          endTime: endTime.toISOString(),
          minutes,
          targetMinutes: timer.targetDurationMinutes,
          completed: snapshot.isFinished,
        });
        // On-time single sessions are announced by the scheduled notification; everything else is cancelled.
        if (!snapshot.isFinished || timer.pomodoro) await cancelTimerNotifications(timer);
        const previous = get().lastSummary;
        set({
          lastSummary: { minutes: (previous?.minutes ?? 0) + minutes, blocks: (previous?.blocks ?? 0) + (minutes > 0 ? 1 : 0) },
          error: null,
        });
      } catch (error) {
        set({ error: t('err.logFocus', { error: toErrorMessage(error) }) });
      } finally {
        busy = false;
      }
    },

    onPhaseElapsed: async () => {
      const timer = get().timer;
      if (!timer || busy) return;
      if (!timer.pomodoro) {
        await get().finish();
        return;
      }
      busy = true;
      try {
        const { timer: next, completedWork } = advanceFinishedPhases(timer);
        for (const work of completedWork) {
          await logWork(timer, { ...work, targetMinutes: work.minutes, completed: true });
        }
        const minutes = completedWork.reduce((sum, w) => sum + w.minutes, 0);
        const previous = get().lastSummary;
        const summary = { minutes: (previous?.minutes ?? 0) + minutes, blocks: (previous?.blocks ?? 0) + completedWork.length };
        if (next) {
          // Notifications for later phases were scheduled up front; keep their ids.
          await persist(next);
          set({ lastSummary: summary });
          await syncSound(next);
        } else {
          await clearRunning();
          set({ lastSummary: summary });
        }
      } catch (error) {
        set({ error: t('err.logFocus', { error: toErrorMessage(error) }) });
      } finally {
        busy = false;
      }
    },

    dismissSummary: () => set({ lastSummary: null }),
  };
});
