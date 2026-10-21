import * as Crypto from 'expo-crypto';
import { create } from 'zustand';
import { AppState, Platform } from 'react-native';
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware';
import { storage } from '@/lib/storage';
import { normalizeCourse } from '@/content/types';
import { emptyDB, type LocalDB } from './types';

interface DBState {
  db: LocalDB;
  /** Applies a pure LocalDB → LocalDB change (see logic.ts) and persists it. */
  update: (change: (db: LocalDB) => LocalDB) => void;
  replace: (db: LocalDB) => void;
}

/**
 * Saves the library at most every SAVE_DELAY_MS instead of on every change: one review or a lesson
 * finishing can change it several times in a row, and each save writes the whole library. Anything
 * pending is written at once when the app goes to the background (or the page is hidden on web).
 */
const SAVE_DELAY_MS = 250;
function batchedStorage<S>(base: Storage): PersistStorage<S> & { flush: () => void } {
  let pending: { name: string; value: StorageValue<S> } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const flush = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    if (!pending) return;
    const { name, value } = pending;
    pending = null;
    base.setItem(name, JSON.stringify(value));
  };
  return {
    getItem: (name) => {
      if (pending?.name === name) return pending.value;
      const raw = base.getItem(name);
      return raw === null ? null : (JSON.parse(raw) as StorageValue<S>);
    },
    setItem: (name, value) => {
      pending = { name, value };
      if (!timer) timer = setTimeout(flush, SAVE_DELAY_MS);
    },
    removeItem: (name) => {
      if (pending?.name === name) pending = null;
      base.removeItem(name);
    },
    flush,
  };
}
const dbStorage = batchedStorage<{ db: LocalDB }>(storage);
AppState.addEventListener('change', (state) => {
  if (state !== 'active') dbStorage.flush();
});
if (Platform.OS === 'web' && typeof window !== 'undefined') window.addEventListener('pagehide', () => dbStorage.flush());

/** Writes any pending change to storage now (before a backup file is made, for example). */
export const flushDB = () => dbStorage.flush();

/**
 * The whole library, stored on the device (SQLite-backed key-value storage on
 * iOS/Android, localStorage on web). Nothing is sent to a server except the
 * text needed for an AI request.
 */
export const useDBStore = create<DBState>()(
  persist(
    (set) => ({
      db: emptyDB(),
      update: (change) => set((s) => ({ db: change(s.db) })),
      replace: (db) => set({ db }),
    }),
    {
      name: 'feynmanmind.db',
      version: 6,
      // v2 added AI courses; v3 added levels, lessons and placements; v4 added
      // questions about lessons; v5 the tutor conversations; v6 printed kits. Fill
      // in anything missing and convert flat AI courses to levels.
      migrate: (persisted) => {
        const state = persisted as { db?: Partial<LocalDB> } | undefined;
        const db = { ...emptyDB(), ...(state?.db ?? {}) };
        db.courses = Object.fromEntries(Object.entries(db.courses).map(([id, c]) => [id, normalizeCourse(c)]));
        return { db } as DBState;
      },
      storage: dbStorage,
      partialize: (s) => ({ db: s.db }),
    },
  ),
);

export const getDB = () => useDBStore.getState().db;

export const newId = () => Crypto.randomUUID();

/** Runs a pure change that also returns a value (e.g. a new id), then saves it. */
export function commit<T>(change: (db: LocalDB) => [LocalDB, T]): T {
  const [next, result] = change(getDB());
  useDBStore.getState().replace(next);
  return result;
}
