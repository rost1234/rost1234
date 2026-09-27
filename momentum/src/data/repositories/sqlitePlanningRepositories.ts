import { guardDb } from '@/core/errors';
import { createId, nowIso } from '@/core/id';
import type { LocalDateString } from '@/core/localDate';
import type { DayMode, Pause, PauseReason } from '@/domain/models';
import { mapPause } from '../db/mappers';
import type { DayModeRow, PauseRow } from '../db/rows';
import type { DayModeRepository, ExecutorProvider, PauseChanges, PauseRepository, ShownInsightRepository } from './types';

export class SqliteDayModeRepository implements DayModeRepository {
  constructor(private readonly db: ExecutorProvider) {}

  get(date: LocalDateString): Promise<DayMode | null> {
    return guardDb('dayModes.get', async () => {
      const db = await this.db();
      const row = await db.getFirstAsync<DayModeRow>('SELECT * FROM day_modes WHERE log_date = ?', [date]);
      return row?.mode === 'minimum' ? 'minimum' : null;
    });
  }

  set(date: LocalDateString, mode: DayMode | null): Promise<void> {
    return guardDb('dayModes.set', async () => {
      const db = await this.db();
      if (mode === null) {
        await db.runAsync('DELETE FROM day_modes WHERE log_date = ?', [date]);
      } else {
        await db.runAsync(
          'INSERT INTO day_modes (log_date, mode) VALUES (?, ?) ON CONFLICT (log_date) DO UPDATE SET mode = excluded.mode',
          [date, mode],
        );
      }
    });
  }
}

export class SqlitePauseRepository implements PauseRepository {
  constructor(private readonly db: ExecutorProvider) {}

  getAll(): Promise<Pause[]> {
    return guardDb('pauses.getAll', async () => {
      const db = await this.db();
      const rows = await db.getAllAsync<PauseRow>('SELECT * FROM pauses ORDER BY start_date ASC');
      return rows.map(mapPause);
    });
  }

  create(startDate: LocalDateString, endDate: LocalDateString, reason: PauseReason, habitId: string | null = null): Promise<Pause> {
    return guardDb('pauses.create', async () => {
      const db = await this.db();
      const pause: Pause = {
        id: createId(),
        startDate,
        endDate: endDate < startDate ? startDate : endDate,
        reason,
        createdAt: nowIso(),
        habitId,
      };
      await db.runAsync('INSERT INTO pauses (id, start_date, end_date, reason, created_at, habit_id) VALUES (?, ?, ?, ?, ?, ?)', [
        pause.id,
        pause.startDate,
        pause.endDate,
        pause.reason,
        pause.createdAt,
        habitId,
      ]);
      return pause;
    });
  }

  update(id: string, changes: PauseChanges): Promise<void> {
    return guardDb('pauses.update', async () => {
      const db = await this.db();
      const endDate = changes.endDate < changes.startDate ? changes.startDate : changes.endDate;
      await db.runAsync('UPDATE pauses SET start_date = ?, end_date = ?, reason = ?, habit_id = ? WHERE id = ?', [
        changes.startDate,
        endDate,
        changes.reason,
        changes.habitId,
        id,
      ]);
    });
  }

  delete(id: string): Promise<void> {
    return guardDb('pauses.delete', async () => {
      const db = await this.db();
      await db.runAsync('DELETE FROM pauses WHERE id = ?', [id]);
    });
  }
}

export class SqliteShownInsightRepository implements ShownInsightRepository {
  constructor(private readonly db: ExecutorProvider) {}

  getAll(): Promise<Record<string, LocalDateString>> {
    return guardDb('shownInsights.getAll', async () => {
      const db = await this.db();
      const rows = await db.getAllAsync<{ insight_id: string; shown_on: string }>('SELECT * FROM shown_insights');
      return Object.fromEntries(rows.map((r) => [r.insight_id, r.shown_on]));
    });
  }

  markShown(insightId: string, date: LocalDateString): Promise<void> {
    return guardDb('shownInsights.markShown', async () => {
      const db = await this.db();
      await db.runAsync(
        'INSERT INTO shown_insights (insight_id, shown_on) VALUES (?, ?) ON CONFLICT (insight_id) DO UPDATE SET shown_on = excluded.shown_on',
        [insightId, date],
      );
    });
  }
}
