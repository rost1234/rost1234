import { guardDb } from '@/core/errors';
import { createId, nowIso } from '@/core/id';
import type { LocalDateString } from '@/core/localDate';
import type { HabitLog } from '@/domain/models';
import { mapHabitLog } from '../db/mappers';
import type { HabitLogRow } from '../db/rows';
import type { ExecutorProvider, HabitLogRepository, HabitLogUpsert } from './types';

export class SqliteHabitLogRepository implements HabitLogRepository {
  constructor(private readonly db: ExecutorProvider) {}

  getForDate(date: LocalDateString): Promise<HabitLog[]> {
    return guardDb('habitLogs.getForDate', async () => {
      const db = await this.db();
      const rows = await db.getAllAsync<HabitLogRow>('SELECT * FROM habit_logs WHERE log_date = ?', [date]);
      return rows.map(mapHabitLog);
    });
  }

  getInRange(start: LocalDateString, end: LocalDateString): Promise<HabitLog[]> {
    return guardDb('habitLogs.getInRange', async () => {
      const db = await this.db();
      const rows = await db.getAllAsync<HabitLogRow>(
        'SELECT * FROM habit_logs WHERE log_date BETWEEN ? AND ? ORDER BY log_date ASC',
        [start, end],
      );
      return rows.map(mapHabitLog);
    });
  }

  upsert(entry: HabitLogUpsert): Promise<HabitLog> {
    return guardDb('habitLogs.upsert', async () => {
      const db = await this.db();
      const updatedAt = nowIso();
      const currentCount = Math.max(0, Math.trunc(entry.currentCount));
      await db.runAsync(
        `INSERT INTO habit_logs (id, habit_id, log_date, current_count, status, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (habit_id, log_date) DO UPDATE SET
           current_count = excluded.current_count,
           status = excluded.status,
           updated_at = excluded.updated_at`,
        [createId(), entry.habitId, entry.logDate, currentCount, entry.status, updatedAt],
      );
      const row = await db.getFirstAsync<HabitLogRow>(
        'SELECT * FROM habit_logs WHERE habit_id = ? AND log_date = ?',
        [entry.habitId, entry.logDate],
      );
      if (!row) throw new Error('Upserted habit log could not be read back');
      return mapHabitLog(row);
    });
  }

  forgive(entries: readonly { habitId: string; logDate: LocalDateString }[]): Promise<void> {
    return guardDb('habitLogs.forgive', async () => {
      const db = await this.db();
      const updatedAt = nowIso();
      for (const entry of entries) {
        await db.runAsync(
          `INSERT INTO habit_logs (id, habit_id, log_date, current_count, status, updated_at)
           VALUES (?, ?, ?, 0, 'forgiven', ?)
           ON CONFLICT (habit_id, log_date) DO UPDATE SET
             status = 'forgiven',
             updated_at = excluded.updated_at
           WHERE habit_logs.status = 'in_progress'`,
          [createId(), entry.habitId, entry.logDate, updatedAt],
        );
      }
    });
  }

  delete(id: string): Promise<void> {
    return guardDb('habitLogs.delete', async () => {
      const db = await this.db();
      await db.runAsync('DELETE FROM habit_logs WHERE id = ?', [id]);
    });
  }
}
