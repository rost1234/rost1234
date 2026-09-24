import { guardDb } from '@/core/errors';
import { nowIso } from '@/core/id';
import type { AppSettings } from '@/domain/models';
import { mapSettings } from '../db/mappers';
import type { AppSettingsRow } from '../db/rows';
import type { ExecutorProvider, SettingsRepository } from './types';

const SETTINGS_ID = 1;

export class SqliteSettingsRepository implements SettingsRepository {
  constructor(private readonly db: ExecutorProvider) {}

  get(): Promise<AppSettings> {
    return guardDb('settings.get', async () => {
      const db = await this.db();
      const row = await db.getFirstAsync<AppSettingsRow>('SELECT * FROM app_settings WHERE id = ?', [SETTINGS_ID]);
      if (row) return mapSettings(row);
      // Self-heal if the singleton row was removed.
      const createdAt = nowIso();
      await db.runAsync(
        'INSERT OR IGNORE INTO app_settings (id, is_onboarding_completed, streak_freezes_available, created_at) VALUES (?, 0, 2, ?)',
        [SETTINGS_ID, createdAt],
      );
      return { id: SETTINGS_ID, isOnboardingCompleted: false, streakFreezesAvailable: 2, createdAt };
    });
  }

  setOnboardingCompleted(completed: boolean): Promise<void> {
    return guardDb('settings.setOnboardingCompleted', async () => {
      const db = await this.db();
      await db.runAsync('UPDATE app_settings SET is_onboarding_completed = ? WHERE id = ?', [completed ? 1 : 0, SETTINGS_ID]);
    });
  }

  consumeStreakFreezes(count: number): Promise<number> {
    return guardDb('settings.consumeStreakFreezes', async () => {
      const db = await this.db();
      await db.runAsync(
        'UPDATE app_settings SET streak_freezes_available = MAX(0, streak_freezes_available - ?) WHERE id = ?',
        [Math.max(0, Math.trunc(count)), SETTINGS_ID],
      );
      const row = await db.getFirstAsync<Pick<AppSettingsRow, 'streak_freezes_available'>>(
        'SELECT streak_freezes_available FROM app_settings WHERE id = ?',
        [SETTINGS_ID],
      );
      return row?.streak_freezes_available ?? 0;
    });
  }
}
