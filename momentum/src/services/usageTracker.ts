import { AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native';
import { runDetached } from '@/core/errors';
import { repositories } from '@/data/repositories';
import { MAX_SESSION_SECONDS, splitByLocalDay } from '@/domain/usage';

const FLUSH_INTERVAL_MS = 60_000;

let segmentStart: number | null = null;
let interval: ReturnType<typeof setInterval> | null = null;
let subscription: NativeEventSubscription | null = null;

/** Writes the time since the last flush (capped) and starts a new segment. */
function flush(now: number, keepRunning: boolean): void {
  if (segmentStart === null) return;
  const end = Math.min(now, segmentStart + MAX_SESSION_SECONDS * 1000);
  for (const slice of splitByLocalDay(segmentStart, end)) {
    runDetached(repositories.usage.addSeconds(slice.logDate, slice.seconds));
  }
  segmentStart = keepRunning ? now : null;
}

function onChange(state: AppStateStatus): void {
  const now = Date.now();
  if (state === 'active') {
    if (segmentStart === null) segmentStart = now;
  } else {
    flush(now, false);
  }
}

/**
 * Measures foreground time only (no content, no analytics, never leaves the
 * device). Flushes every minute so a killed app loses at most ~60 seconds.
 */
export function startUsageTracking(): void {
  if (subscription) return;
  if (AppState.currentState === 'active') segmentStart = Date.now();
  subscription = AppState.addEventListener('change', onChange);
  interval = setInterval(() => {
    if (segmentStart !== null) flush(Date.now(), true);
  }, FLUSH_INTERVAL_MS);
}

/** Test/teardown helper. */
export function stopUsageTracking(): void {
  if (interval) clearInterval(interval);
  interval = null;
  subscription?.remove();
  subscription = null;
  segmentStart = null;
}
