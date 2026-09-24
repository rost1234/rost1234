/**
 * Stateless focus timer. Only the start timestamp, target and pause bookkeeping
 * are persisted; the remaining time is always *derived* from the wall clock, so
 * backgrounding, phone locks or even an app kill never drift the countdown.
 */

export interface PersistedTimer {
  /** ISO timestamp of when the session started. */
  startTime: string;
  targetDurationMinutes: number;
  /** Total milliseconds spent paused before the current pause (if any). */
  pausedAccumulatedMs: number;
  /** ISO timestamp of the current pause, or null while running. */
  pausedAt: string | null;
  habitId: string | null;
  taskId: string | null;
  /** Id of the scheduled "session complete" notification, if any. */
  notificationId: string | null;
  /** Present for Pomodoro sessions: which phase this timer represents. */
  pomodoro?: PomodoroPhase;
  /** Notifications scheduled for later Pomodoro phase changes. */
  extraNotificationIds?: string[];
}

export interface PomodoroPhase {
  workMinutes: number;
  breakMinutes: number;
  totalCycles: number;
  /** 1-based cycle number. */
  cycle: number;
  phase: 'work' | 'break';
}

export interface TimerSnapshot {
  elapsedSeconds: number;
  remainingSeconds: number;
  totalSeconds: number;
  /** 0..1 fraction of the session elapsed. */
  progress: number;
  isPaused: boolean;
  isFinished: boolean;
}

const toMs = (iso: string): number => new Date(iso).getTime();

export function createTimer(
  targetDurationMinutes: number,
  link: { habitId: string | null; taskId: string | null },
  now: Date = new Date(),
): PersistedTimer {
  return {
    startTime: now.toISOString(),
    targetDurationMinutes,
    pausedAccumulatedMs: 0,
    pausedAt: null,
    habitId: link.habitId,
    taskId: link.taskId,
    notificationId: null,
  };
}

/** elapsed = now − start − paused time; remaining = target − elapsed. */
export function computeSnapshot(timer: PersistedTimer, now: Date = new Date()): TimerSnapshot {
  const totalSeconds = Math.max(1, Math.round(timer.targetDurationMinutes * 60));
  const effectiveNow = timer.pausedAt ? toMs(timer.pausedAt) : now.getTime();
  const elapsedMs = Math.max(0, effectiveNow - toMs(timer.startTime) - timer.pausedAccumulatedMs);
  const elapsedSeconds = Math.min(totalSeconds, Math.floor(elapsedMs / 1000));
  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);

  return {
    elapsedSeconds,
    remainingSeconds,
    totalSeconds,
    progress: elapsedSeconds / totalSeconds,
    isPaused: timer.pausedAt !== null,
    isFinished: remainingSeconds === 0,
  };
}

export function pauseTimer(timer: PersistedTimer, now: Date = new Date()): PersistedTimer {
  if (timer.pausedAt) return timer;
  return { ...timer, pausedAt: now.toISOString() };
}

export function resumeTimer(timer: PersistedTimer, now: Date = new Date()): PersistedTimer {
  if (!timer.pausedAt) return timer;
  return {
    ...timer,
    pausedAccumulatedMs: timer.pausedAccumulatedMs + Math.max(0, now.getTime() - toMs(timer.pausedAt)),
    pausedAt: null,
  };
}

/** Wall-clock moment the session will end if it keeps running. */
export function projectedEndDate(timer: PersistedTimer, now: Date = new Date()): Date {
  return new Date(now.getTime() + computeSnapshot(timer, now).remainingSeconds * 1000);
}

/** Minutes actually focused, rounded to the nearest minute. */
export function focusedMinutes(snapshot: TimerSnapshot): number {
  return Math.round(snapshot.elapsedSeconds / 60);
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function isPersistedTimer(value: unknown): value is PersistedTimer {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  const nullableString = (x: unknown): boolean => x === null || typeof x === 'string';
  return (
    typeof v.startTime === 'string' &&
    typeof v.targetDurationMinutes === 'number' &&
    typeof v.pausedAccumulatedMs === 'number' &&
    nullableString(v.pausedAt) &&
    nullableString(v.habitId) &&
    nullableString(v.taskId) &&
    nullableString(v.notificationId) &&
    (v.pomodoro === undefined || isPomodoroPhase(v.pomodoro)) &&
    (v.extraNotificationIds === undefined ||
      (Array.isArray(v.extraNotificationIds) && v.extraNotificationIds.every((id) => typeof id === 'string')))
  );
}

function isPomodoroPhase(value: unknown): value is PomodoroPhase {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.workMinutes === 'number' &&
    typeof p.breakMinutes === 'number' &&
    typeof p.totalCycles === 'number' &&
    typeof p.cycle === 'number' &&
    (p.phase === 'work' || p.phase === 'break')
  );
}
