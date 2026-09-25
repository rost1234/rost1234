import * as Crypto from 'expo-crypto';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { storage } from '@/lib/storage';
import { emptyDB, type LocalDB } from './types';

interface DBState {
  db: LocalDB;
  /** Applies a pure LocalDB → LocalDB change (see logic.ts) and persists it. */
  update: (change: (db: LocalDB) => LocalDB) => void;
  replace: (db: LocalDB) => void;
}

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
      version: 1,
      storage: createJSONStorage(() => storage),
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
