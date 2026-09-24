import { guardDb } from '@/core/errors';
import { TABLES } from '../db/schema';
import type { BackupRepository, DatabaseSnapshot, ExecutorProvider } from './types';

export class SqliteBackupRepository implements BackupRepository {
  constructor(private readonly db: ExecutorProvider) {}

  exportAll(): Promise<DatabaseSnapshot> {
    return guardDb('backup.exportAll', async () => {
      const db = await this.db();
      const snapshot = {} as DatabaseSnapshot;
      for (const table of TABLES) {
        // Table names come from a fixed, typed whitelist — never user input.
        snapshot[table] = await db.getAllAsync<Record<string, unknown>>(`SELECT * FROM ${table}`);
      }
      return snapshot;
    });
  }
}
