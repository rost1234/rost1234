import { guardDb } from '@/core/errors';
import { nowIso } from '@/core/id';
import type { LocalDateString } from '@/core/localDate';
import type { AppSettings } from '@/domain/models';
import { mapSettings } from '../db/mappers';
import type { AppSettingsRow } from '../db/rows';
import type { ExecutorProvider, SettingsRepository } from './types';

const SETTINGS_ID = 1;
const DEFAULT_REMINDER_MINUTES = 21 * 60;

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
      return { id: SETTINGS_ID, isOnboardingCompleted: false, streakFreezesAvailable: 2, createdAt, lastFreezeAwardDate: null, reflectionReminderMinutes: DEFAULT_REMINDER_MINUTES, goal: null };
    });
  }

  setOnboardingCompleted(completed: boolean): Promise<void> {
    return guardDb('settings.setOnboardingCompleted', async () => {
      const db = await this.db();
      await db.runAsync('UPDATE app_settings SET is_onboarding_completed = ? WHERE id = ?', [completed ? 1 : 0, SETTINGS_ID]);
    });
  }

  setGoal(goal: string | null): Promise<void> {
    return guardDb('settings.setGoal', async () => {
      const db = await this.db();
      await db.runAsync('UPDATE app_settings SET goal = ? WHERE id = ?', [goal, SETTINGS_ID]);
    });
  }

  setReflectionReminder(minutes: number | null): Promise<void> {
    return guardDb('settings.setReflectionReminder', async () => {
      const db = await this.db();
      const value = minutes === null ? null : Math.max(0, Math.min(24 * 60 - 1, Math.trunc(minutes)));
      await db.runAsync('UPDATE app_settings SET reflection_reminder_minutes = ? WHERE id = ?', [value, SETTINGS_ID]);
    });
  }

  awardStreakFreeze(on: LocalDateString, max: number): Promise<number> {
    return guardDb('settings.awardStreakFreeze', async () => {
      const db = await this.db();
      await db.runAsync(
        'UPDATE app_settings SET streak_freezes_available = MIN(?, streak_freezes_available + 1), last_freeze_award_date = ? WHERE id = ?',
        [max, on, SETTINGS_ID],
      );
      return this.freezeBalance();
    });
  }

  private async freezeBalance(): Promise<number> {
    const db = await this.db();
    const row = await db.getFirstAsync<Pick<AppSettingsRow, 'streak_freezes_available'>>(
      'SELECT streak_freezes_available FROM app_settings WHERE id = ?',
      [SETTINGS_ID],
    );
    return row?.streak_freezes_available ?? 0;
  }

  consumeStreakFreezes(count: number): Promise<number> {
    return guardDb('settings.consumeStreakFreezes', async () => {
      const db = await this.db();
      await db.runAsync(
        'UPDATE app_settings SET streak_freezes_available = MAX(0, streak_freezes_available - ?) WHERE id = ?',
        [Math.max(0, Math.trunc(count)), SETTINGS_ID],
      );
      return this.freezeBalance();
    });
  }
}
