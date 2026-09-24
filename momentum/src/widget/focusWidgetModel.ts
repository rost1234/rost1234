import { computeSnapshot, projectedEndDate, type PersistedTimer } from '@/domain/focusTimer';

export type FocusWidgetModel =
  | { kind: 'idle' }
  /** A session ran out while the app was closed; opening the app logs it. */
  | { kind: 'finished' }
  | { kind: 'running'; endsAt: string; isPaused: boolean; isBreak: boolean };

/**
 * What the Focus widget shows. Widgets can't tick every second, so a running
 * session shows its end time rather than a countdown.
 */
export function buildFocusWidgetModel(timer: PersistedTimer | null, now: Date, locale: string): FocusWidgetModel {
  if (!timer) return { kind: 'idle' };
  const snapshot = computeSnapshot(timer, now);
  if (snapshot.isFinished) return { kind: 'finished' };
  const end = projectedEndDate(timer, now);
  return {
    kind: 'running',
    endsAt: new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(end),
    isPaused: snapshot.isPaused,
    isBreak: timer.pomodoro?.phase === 'break',
  };
}
