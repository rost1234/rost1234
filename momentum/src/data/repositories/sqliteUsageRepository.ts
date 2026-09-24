import { guardDb } from '@/core/errors';
import type { LocalDateString } from '@/core/localDate';
import type { DailyUsage } from '@/domain/models';
import type { AppUsageRow } from '../db/rows';
import type { ExecutorProvider, UsageRepository } from './types';

export class SqliteUsageRepository implements UsageRepository {
  constructor(private readonly db: ExecutorProvider) {}

  addSeconds(date: LocalDateString, seconds: number): Promise<void> {
    return guardDb('usage.addSeconds', async () => {
      const whole = Math.max(0, Math.round(seconds));
      if (whole === 0) return;
      const db = await this.db();
      await db.runAsync(
        `INSERT INTO app_usage (log_date, seconds) VALUES (?, ?)
         ON CONFLICT (log_date) DO UPDATE SET seconds = app_usage.seconds + excluded.seconds`,
        [date, whole],
      );
    });
  }

  getInRange(start: LocalDateString, end: LocalDateString): Promise<DailyUsage[]> {
    return guardDb('usage.getInRange', async () => {
      const db = await this.db();
      const rows = await db.getAllAsync<AppUsageRow>(
        'SELECT * FROM app_usage WHERE log_date BETWEEN ? AND ? ORDER BY log_date ASC',
        [start, end],
      );
      return rows.map((row) => ({ logDate: row.log_date, seconds: row.seconds }));
    });
  }
}
