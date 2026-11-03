import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { storage } from '@/lib/storage';

export interface ErrorEntry {
  at: string;
  /** Where it happened: 'crash', 'screen', 'backup', 'lesson-queue'… */
  where: string;
  message: string;
  stack?: string;
}

const MAX_ENTRIES = 30;

/**
 * A small on-device log of errors (newest first), shown in Settings → About with a copy
 * button, so a problem on the phone can be reported without a crash-reporting service.
 */
export const useErrorLog = create<{ entries: ErrorEntry[]; clear: () => void }>()(
  persist(
    (set) => ({
      entries: [],
      clear: () => set({ entries: [] }),
    }),
    { name: 'feynmanmind.errors', storage: createJSONStorage(() => storage), partialize: ({ entries }) => ({ entries }) },
  ),
);

export function recordError(where: string, error: unknown): void {
  try {
    const e = error instanceof Error ? error : new Error(String(error));
    const entry: ErrorEntry = { at: new Date().toISOString(), where, message: e.message.slice(0, 500), stack: e.stack?.split('\n').slice(0, 6).join('\n') };
    useErrorLog.setState((s) => ({ entries: [entry, ...s.entries].slice(0, MAX_ENTRIES) }));
  } catch {
    // Logging must never cause another error.
  }
}

/** The log as plain text, ready to paste into a message. */
export function errorLogText(entries: ErrorEntry[], version: string): string {
  return [`FeynmanMind ${version}`, ...entries.map((e) => `[${e.at}] ${e.where}: ${e.message}${e.stack ? `\n${e.stack}` : ''}`)].join('\n\n');
}

let installed = false;
/** Records uncaught JavaScript errors (then lets React Native handle them as before). */
export function installErrorLog(): void {
  if (installed) return;
  installed = true;
  const utils = (globalThis as { ErrorUtils?: { getGlobalHandler: () => (e: unknown, fatal?: boolean) => void; setGlobalHandler: (h: (e: unknown, fatal?: boolean) => void) => void } }).ErrorUtils;
  if (!utils) return;
  const previous = utils.getGlobalHandler();
  utils.setGlobalHandler((error, fatal) => {
    recordError(fatal ? 'crash' : 'error', error);
    previous(error, fatal);
  });
}
