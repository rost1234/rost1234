import { guardDb } from '@/core/errors';
import type { BackupTables } from '../backup/backupFormat';
import { TABLE_COLUMNS, TABLES } from '../db/schema';
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

  replaceAll(tables: BackupTables): Promise<void> {
    return guardDb('backup.replaceAll', async () => {
      const db = await this.db();
      // Children first so foreign keys never dangle mid-way.
      for (const table of [...TABLES].reverse()) {
        await db.runAsync(`DELETE FROM ${table}`);
      }
      for (const table of TABLES) {
        // Column names come from the schema whitelist, values are bound parameters.
        const columns = Object.keys(TABLE_COLUMNS[table]);
        const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;
        for (const row of tables[table]) {
          await db.runAsync(sql, columns.map((column) => row[column] ?? null));
        }
      }
    });
  }
}
