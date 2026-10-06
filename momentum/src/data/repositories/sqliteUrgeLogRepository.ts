import { guardDb } from '@/core/errors';
import { createId } from '@/core/id';
import type { LocalDateString } from '@/core/localDate';
import type { NewUrgeLog, UrgeLog, UrgeTrigger } from '@/domain/models';
import { mapUrgeLog } from '../db/mappers';
import type { UrgeLogRow } from '../db/rows';
import type { ExecutorProvider, UrgeLogRepository } from './types';

export class SqliteUrgeLogRepository implements UrgeLogRepository {
  constructor(private readonly db: ExecutorProvider) {}

  getInRange(start: LocalDateString, end: LocalDateString): Promise<UrgeLog[]> {
    return guardDb('urges.getInRange', async () => {
      const db = await this.db();
      const rows = await db.getAllAsync<UrgeLogRow>(
        'SELECT * FROM urge_logs WHERE log_date >= ? AND log_date <= ? ORDER BY started_at ASC',
        [start, end],
      );
      return rows.map(mapUrgeLog);
    });
  }

  create(input: NewUrgeLog): Promise<UrgeLog> {
    return guardDb('urges.create', async () => {
      const db = await this.db();
      const log: UrgeLog = { ...input, id: createId() };
      await db.runAsync(
        'INSERT INTO urge_logs (id, habit_id, started_at, log_date, outcome, trigger_tag, mode) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [log.id, log.habitId, log.startedAt, log.logDate, log.outcome, log.trigger, log.mode],
      );
      return log;
    });
  }

  setTrigger(id: string, trigger: UrgeTrigger | null): Promise<void> {
    return guardDb('urges.setTrigger', async () => {
      const db = await this.db();
      await db.runAsync('UPDATE urge_logs SET trigger_tag = ? WHERE id = ?', [trigger, id]);
    });
  }
}
