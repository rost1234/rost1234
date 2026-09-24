import { guardDb } from '@/core/errors';
import { createId, nowIso } from '@/core/id';
import type { FocusSession, NewFocusSession } from '@/domain/models';
import { mapFocusSession } from '../db/mappers';
import type { FocusSessionRow } from '../db/rows';
import type { ExecutorProvider, FocusSessionRepository } from './types';

export class SqliteFocusSessionRepository implements FocusSessionRepository {
  constructor(private readonly db: ExecutorProvider) {}

  create(input: NewFocusSession): Promise<FocusSession> {
    return guardDb('focusSessions.create', async () => {
      const db = await this.db();
      const session: FocusSession = {
        ...input,
        durationMinutes: Math.max(0, Math.round(input.durationMinutes)),
        id: createId(),
        createdAt: nowIso(),
      };
      await db.runAsync(
        `INSERT INTO focus_sessions (id, habit_id, task_id, start_time, end_time, duration_minutes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          session.id,
          session.habitId,
          session.taskId,
          session.startTime,
          session.endTime,
          session.durationMinutes,
          session.createdAt,
        ],
      );
      return session;
    });
  }

  getInRange(startIso: string, endIso: string): Promise<FocusSession[]> {
    return guardDb('focusSessions.getInRange', async () => {
      const db = await this.db();
      const rows = await db.getAllAsync<FocusSessionRow>(
        'SELECT * FROM focus_sessions WHERE start_time >= ? AND start_time < ? ORDER BY start_time ASC',
        [startIso, endIso],
      );
      return rows.map(mapFocusSession);
    });
  }

  getAll(): Promise<FocusSession[]> {
    return guardDb('focusSessions.getAll', async () => {
      const db = await this.db();
      const rows = await db.getAllAsync<FocusSessionRow>('SELECT * FROM focus_sessions ORDER BY start_time ASC');
      return rows.map(mapFocusSession);
    });
  }

  delete(id: string): Promise<void> {
    return guardDb('focusSessions.delete', async () => {
      const db = await this.db();
      await db.runAsync('DELETE FROM focus_sessions WHERE id = ?', [id]);
    });
  }
}
