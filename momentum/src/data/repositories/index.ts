import { guardDb } from '@/core/errors';
import { getDatabase } from '../db/database';
import { SqliteBackupRepository } from './sqliteBackupRepository';
import { SqliteFocusSessionRepository } from './sqliteFocusSessionRepository';
import { SqliteHabitLogRepository } from './sqliteHabitLogRepository';
import { SqliteHabitRepository } from './sqliteHabitRepository';
import { SqliteReflectionRepository } from './sqliteReflectionRepository';
import { SqliteSettingsRepository } from './sqliteSettingsRepository';
import { SqliteTaskRepository } from './sqliteTaskRepository';
import type {
  BackupRepository,
  ExecutorProvider,
  FocusSessionRepository,
  HabitLogRepository,
  HabitRepository,
  ReflectionRepository,
  SettingsRepository,
  SqlExecutor,
  TaskRepository,
} from './types';

export interface Repositories {
  settings: SettingsRepository;
  habits: HabitRepository;
  habitLogs: HabitLogRepository;
  tasks: TaskRepository;
  focusSessions: FocusSessionRepository;
  reflections: ReflectionRepository;
  backup: BackupRepository;
}

function createRepositories(provider: ExecutorProvider): Repositories {
  return {
    settings: new SqliteSettingsRepository(provider),
    habits: new SqliteHabitRepository(provider),
    habitLogs: new SqliteHabitLogRepository(provider),
    tasks: new SqliteTaskRepository(provider),
    focusSessions: new SqliteFocusSessionRepository(provider),
    reflections: new SqliteReflectionRepository(provider),
    backup: new SqliteBackupRepository(provider),
  };
}

/** App-wide repositories bound to the shared database connection. */
export const repositories: Repositories = createRepositories(getDatabase);

/**
 * Runs `work` inside an exclusive SQLite transaction. Repositories passed to
 * the callback are bound to the transaction, so either every write commits or
 * none does.
 */
export function inTransaction<T>(operation: string, work: (repos: Repositories) => Promise<T>): Promise<T> {
  return guardDb(operation, async () => {
    const db = await getDatabase();
    let result: { value: T } | null = null;
    await db.withExclusiveTransactionAsync(async (txn) => {
      const executor: SqlExecutor = txn;
      result = { value: await work(createRepositories(() => Promise.resolve(executor))) };
    });
    if (!result) throw new Error(`Transaction "${operation}" produced no result`);
    return (result as { value: T }).value;
  });
}

export type * from './types';
