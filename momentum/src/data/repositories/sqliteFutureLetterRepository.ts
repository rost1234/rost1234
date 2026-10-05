import { guardDb } from '@/core/errors';
import { createId, nowIso } from '@/core/id';
import type { LocalDateString } from '@/core/localDate';
import type { FutureLetter } from '@/domain/models';
import { mapFutureLetter } from '../db/mappers';
import type { FutureLetterRow } from '../db/rows';
import type { ExecutorProvider, FutureLetterRepository } from './types';

export class SqliteFutureLetterRepository implements FutureLetterRepository {
  constructor(private readonly db: ExecutorProvider) {}

  getAll(): Promise<FutureLetter[]> {
    return guardDb('letters.getAll', async () => {
      const db = await this.db();
      const rows = await db.getAllAsync<FutureLetterRow>('SELECT * FROM future_letters ORDER BY open_on ASC');
      return rows.map(mapFutureLetter);
    });
  }

  create(body: string, writtenOn: LocalDateString, openOn: LocalDateString): Promise<FutureLetter> {
    return guardDb('letters.create', async () => {
      const db = await this.db();
      const letter: FutureLetter = { id: createId(), body: body.trim(), writtenOn, openOn, openedAt: null };
      await db.runAsync('INSERT INTO future_letters (id, body, written_on, open_on, opened_at) VALUES (?, ?, ?, ?, NULL)', [
        letter.id,
        letter.body,
        letter.writtenOn,
        letter.openOn,
      ]);
      return letter;
    });
  }

  markOpened(id: string): Promise<void> {
    return guardDb('letters.markOpened', async () => {
      const db = await this.db();
      await db.runAsync('UPDATE future_letters SET opened_at = COALESCE(opened_at, ?) WHERE id = ?', [nowIso(), id]);
    });
  }

  delete(id: string): Promise<void> {
    return guardDb('letters.delete', async () => {
      const db = await this.db();
      await db.runAsync('DELETE FROM future_letters WHERE id = ?', [id]);
    });
  }
}
