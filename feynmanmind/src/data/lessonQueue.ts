import { create } from 'zustand';
import { ApiError } from '@/api/functions';
import { isImportedCourse, stationsNeedingLessons } from '@/local/logic';
import { getDB } from '@/local/store';
import { findCourse, writeStationLesson } from './courses';
import { upgradeOne } from './imports';

/** One course's batch of lessons being written. Not persisted: it lives while the app is open. */
export interface LessonJob {
  total: number;
  /** Finished, including the ones that failed. */
  done: number;
  /** Station keys that couldn't be written. */
  failed: string[];
  /** When the server's request limit has the queue waiting: until what time (ms). */
  waitUntil: number | null;
  running: boolean;
}

interface QueueState {
  jobs: Record<string, LessonJob>;
  set: (courseId: string, job: Partial<LessonJob> | null) => void;
}

export const useLessonQueue = create<QueueState>((set) => ({
  jobs: {},
  set: (courseId, job) =>
    set((s) => {
      if (job === null) {
        const { [courseId]: _gone, ...rest } = s.jobs;
        return { jobs: rest };
      }
      const prev = s.jobs[courseId] ?? { total: 0, done: 0, failed: [], waitUntil: null, running: false };
      return { jobs: { ...s.jobs, [courseId]: { ...prev, ...job } } };
    }),
}));

/** Two lessons at a time: faster than one by one, gentle on the AI server. */
const CONCURRENCY = 2;
/** The server allows a limited number of lessons per hour; when it says "too many", wait and try again, for up to about an hour. */
// (A test can shorten it: globalThis.__LESSON_QUEUE_RATE_WAIT_MS.)
const RATE_WAIT_MS: number = (globalThis as { __LESSON_QUEUE_RATE_WAIT_MS?: number }).__LESSON_QUEUE_RATE_WAIT_MS ?? 30_000;
const RATE_TRIES = 130;
const cancelled = new Set<string>();
/** How many of a course's lessons are waiting on the rate limit right now. */
const waiters = new Map<string, number>();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Waits `ms`, in short steps so a cancel is noticed quickly. Returns false if cancelled. */
async function wait(courseId: string, ms: number): Promise<boolean> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (cancelled.has(courseId)) return false;
    await sleep(Math.min(1000, end - Date.now()));
  }
  return !cancelled.has(courseId);
}

/** Writes one lesson, riding out rate limits and flaky connections. Throws when it gives up. */
async function writeOne(courseId: string, key: string): Promise<void> {
  const { set } = useLessonQueue.getState();
  let other = 0;
  for (let rate = 0; ; ) {
    try {
      if (isImportedCourse(courseId)) await upgradeOne(courseId, key);
      else await writeStationLesson(courseId, key, 'he');
      return;
    } catch (e) {
      if (e instanceof ApiError && e.code === 'rate_limited' && rate < RATE_TRIES) {
        rate++;
        waiters.set(courseId, (waiters.get(courseId) ?? 0) + 1);
        set(courseId, { waitUntil: Date.now() + RATE_WAIT_MS });
        const resumed = await wait(courseId, RATE_WAIT_MS);
        const left = (waiters.get(courseId) ?? 1) - 1;
        waiters.set(courseId, left);
        if (!left) set(courseId, { waitUntil: null });
        if (!resumed) throw e;
        continue;
      }
      // A dropped connection or a model hiccup: a couple more tries, a few seconds apart.
      if (e instanceof ApiError && e.retryable && other < 2) {
        other++;
        if (!(await wait(courseId, 4000))) throw e;
        continue;
      }
      throw e;
    }
  }
}

/**
 * Writes the missing lessons of a course (at most `limit`, in course order).
 * A lesson that fails is skipped and listed, not a reason to stop; the rest continue.
 * Running it again picks up what is still missing.
 */
export async function startLessonQueue(courseId: string, limit = Infinity): Promise<void> {
  const state = useLessonQueue.getState();
  if (state.jobs[courseId]?.running) return;
  const course = findCourse(courseId);
  if (!course) return;
  const todo = stationsNeedingLessons(getDB(), course).slice(0, limit).map((s) => s.key);
  if (!todo.length) return;
  cancelled.delete(courseId);
  state.set(courseId, { total: todo.length, done: 0, failed: [], waitUntil: null, running: true });
  let next = 0;
  const worker = async () => {
    while (!cancelled.has(courseId)) {
      const key = todo[next++];
      if (key === undefined) return;
      try {
        await writeOne(courseId, key);
      } catch (e) {
        const stopped = cancelled.has(courseId);
        // Without an AI connection nothing else will work either: stop. A cancel isn't a failure.
        if (e instanceof ApiError && e.code === 'not_configured') cancelled.add(courseId);
        if (!stopped || (e instanceof ApiError && e.code === 'not_configured')) {
          const cur = useLessonQueue.getState().jobs[courseId];
          useLessonQueue.getState().set(courseId, { failed: [...(cur?.failed ?? []), key] });
        }
      }
      const cur = useLessonQueue.getState().jobs[courseId];
      useLessonQueue.getState().set(courseId, { done: (cur?.done ?? 0) + 1 });
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, worker));
  useLessonQueue.getState().set(courseId, { running: false, waitUntil: null });
}

export function cancelLessonQueue(courseId: string) {
  cancelled.add(courseId);
}

export function clearLessonJob(courseId: string) {
  useLessonQueue.getState().set(courseId, null);
}
