import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { MIGRATIONS } from '../db/schema';
import type { SqlExecutor } from '../repositories/types';

type Params = SQLInputValue[];

const toParams = (args: unknown[]): Params => {
  const [first] = args;
  const list = args.length === 1 && Array.isArray(first) ? first : args;
  return list.map((v) => (typeof v === 'boolean' ? Number(v) : v)) as Params;
};

/**
 * Runs the real repositories against Node's built-in SQLite, exposing the same
 * subset of the expo-sqlite API they use. Test-only.
 */
export function createTestDatabase(options: { upToVersion?: number } = {}): { db: DatabaseSync; executor: SqlExecutor } {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  for (const migration of MIGRATIONS) {
    if (options.upToVersion !== undefined && migration.version > options.upToVersion) break;
    db.exec(migration.statements);
  }

  const executor = {
    execAsync: async (source: string) => {
      db.exec(source);
    },
    runAsync: async (source: string, ...args: unknown[]) => {
      const result = db.prepare(source).run(...toParams(args));
      return { lastInsertRowId: Number(result.lastInsertRowid), changes: Number(result.changes) };
    },
    getAllAsync: async (source: string, ...args: unknown[]) => db.prepare(source).all(...toParams(args)),
    getFirstAsync: async (source: string, ...args: unknown[]) => db.prepare(source).get(...toParams(args)) ?? null,
  } as unknown as SqlExecutor;

  return { db, executor };
}

export function applyRemainingMigrations(db: DatabaseSync, fromVersion: number): void {
  for (const migration of MIGRATIONS) {
    if (migration.version > fromVersion) db.exec(migration.statements);
  }
}
