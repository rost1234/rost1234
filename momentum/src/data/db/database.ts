import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { guardDb } from '@/core/errors';
import { MIGRATIONS } from './schema';

const DATABASE_NAME = 'momentum.db';

let databasePromise: Promise<SQLiteDatabase> | null = null;

async function migrate(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;
  const pending = MIGRATIONS.filter((m) => m.version > currentVersion).sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.execAsync(migration.statements);
      // PRAGMA does not accept bound parameters; version is a trusted integer.
      await txn.execAsync(`PRAGMA user_version = ${Math.trunc(migration.version)}`);
    });
  }
}

async function open(): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync(DATABASE_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  await migrate(db);
  return db;
}

/** Lazily opens (and migrates) the single app database. */
export function getDatabase(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = guardDb('open database', open).catch((error: unknown) => {
      // Allow a retry on the next call instead of caching the failure.
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}
