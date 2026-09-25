import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { LocalDateString } from '@/core/localDate';
import { repositories } from '@/data/repositories';
import { progressOf } from '@/domain/habitProgress';
import type { LogSource } from '@/domain/models';
import { t } from '@/i18n';

export const HABIT_REMINDER_CATEGORY = 'habit-reminder';
export const CHECKIN_CATEGORY = 'habit-checkin';
export const DONE_ACTION = 'done';
export const DONE_ALL_ACTION = 'done-all';

/** Registers the "Done ✓" / "All done ✓" buttons shown on habit notifications (idempotent). */
export async function registerReminderCategory(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Promise.all([
    Notifications.setNotificationCategoryAsync(HABIT_REMINDER_CATEGORY, [
      { identifier: DONE_ACTION, buttonTitle: t('remind.doneButton'), options: { opensAppToForeground: false } },
    ]),
    Notifications.setNotificationCategoryAsync(CHECKIN_CATEGORY, [
      { identifier: DONE_ALL_ACTION, buttonTitle: t('remind.allDoneButton'), options: { opensAppToForeground: false } },
    ]),
  ]);
}

/** Marks the habit complete without opening the app. */
export async function completeFromNotification(habitId: string, date: LocalDateString, source: LogSource): Promise<boolean> {
  const habit = await repositories.habits.getById(habitId);
  if (!habit || habit.isArchived) return false;
  const log = (await repositories.habitLogs.getForDate(date)).find((l) => l.habitId === habitId);
  const progress = progressOf(log);
  if (progress.status === 'completed' || progress.status === 'skipped') return false;
  await repositories.habitLogs.upsert({
    habitId,
    logDate: date,
    currentCount: habit.isQuantitative ? Math.max(progress.currentCount, habit.targetCount) : 1,
    status: 'completed',
    source,
  });
  return true;
}
