import { guardDb } from '@/core/errors';
import { createId, nowIso } from '@/core/id';
import type { LocalDateString } from '@/core/localDate';
import type { DayMode, Pause, PauseReason } from '@/domain/models';
import { mapPause } from '../db/mappers';
import type { DayModeRow, PauseRow } from '../db/rows';
import type { DayModeRepository, ExecutorProvider, PauseRepository } from './types';

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

  create(startDate: LocalDateString, endDate: LocalDateString, reason: PauseReason): Promise<Pause> {
    return guardDb('pauses.create', async () => {
      const db = await this.db();
      const pause: Pause = {
        id: createId(),
        startDate,
        endDate: endDate < startDate ? startDate : endDate,
        reason,
        createdAt: nowIso(),
      };
      await db.runAsync('INSERT INTO pauses (id, start_date, end_date, reason, created_at) VALUES (?, ?, ?, ?, ?)', [
        pause.id,
        pause.startDate,
        pause.endDate,
        pause.reason,
        pause.createdAt,
      ]);
      return pause;
    });
  }

  delete(id: string): Promise<void> {
    return guardDb('pauses.delete', async () => {
      const db = await this.db();
      await db.runAsync('DELETE FROM pauses WHERE id = ?', [id]);
    });
  }
}
