import { guardDb } from '@/core/errors';
import { createId, nowIso } from '@/core/id';
import type { LocalDateString } from '@/core/localDate';
import type { DailyReflection, ReflectionInput } from '@/domain/models';
import { mapReflection } from '../db/mappers';
import type { DailyReflectionRow } from '../db/rows';
import type { ExecutorProvider, ReflectionRepository } from './types';

export class SqliteReflectionRepository implements ReflectionRepository {
  constructor(private readonly db: ExecutorProvider) {}

  getByDate(date: LocalDateString): Promise<DailyReflection | null> {
    return guardDb('reflections.getByDate', async () => {
      const db = await this.db();
      const row = await db.getFirstAsync<DailyReflectionRow>('SELECT * FROM daily_reflections WHERE log_date = ?', [date]);
      return row ? mapReflection(row) : null;
    });
  }

  getInRange(start: LocalDateString, end: LocalDateString): Promise<DailyReflection[]> {
    return guardDb('reflections.getInRange', async () => {
      const db = await this.db();
      const rows = await db.getAllAsync<DailyReflectionRow>(
        'SELECT * FROM daily_reflections WHERE log_date BETWEEN ? AND ? ORDER BY log_date ASC',
        [start, end],
      );
      return rows.map(mapReflection);
    });
  }

  upsert(input: ReflectionInput): Promise<DailyReflection> {
    return guardDb('reflections.upsert', async () => {
      const db = await this.db();
      await db.runAsync(
        `INSERT INTO daily_reflections (id, log_date, mood_score, gratitude_text, lesson_text, created_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (log_date) DO UPDATE SET
           mood_score = excluded.mood_score,
           gratitude_text = excluded.gratitude_text,
           lesson_text = excluded.lesson_text`,
        [createId(), input.logDate, input.moodScore, input.gratitudeText.trim(), input.lessonText.trim(), nowIso()],
      );
      const row = await db.getFirstAsync<DailyReflectionRow>('SELECT * FROM daily_reflections WHERE log_date = ?', [input.logDate]);
      if (!row) throw new Error('Upserted reflection could not be read back');
      return mapReflection(row);
    });
  }

  delete(id: string): Promise<void> {
    return guardDb('reflections.delete', async () => {
      const db = await this.db();
      await db.runAsync('DELETE FROM daily_reflections WHERE id = ?', [id]);
    });
  }
}
