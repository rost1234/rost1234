import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { LocalDateString } from '@/core/localDate';
import { repositories } from '@/data/repositories';
import { progressOf } from '@/domain/habitProgress';
import { t } from '@/i18n';

export const HABIT_REMINDER_CATEGORY = 'habit-reminder';
export const DONE_ACTION = 'done';

/** Registers the "Done ✓" button shown on habit reminders (idempotent). */
export async function registerReminderCategory(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.setNotificationCategoryAsync(HABIT_REMINDER_CATEGORY, [
    { identifier: DONE_ACTION, buttonTitle: t('remind.doneButton'), options: { opensAppToForeground: false } },
  ]);
}

/** Handles the "Done ✓" button: marks the habit complete without opening the app. */
export async function completeFromNotification(habitId: string, date: LocalDateString): Promise<boolean> {
  const habit = await repositories.habits.getById(habitId);
  if (!habit || habit.isArchived) return false;
  const log = (await repositories.habitLogs.getForDate(date)).find((l) => l.habitId === habitId);
  const progress = progressOf(log);
  if (progress.status === 'completed') return false;
  await repositories.habitLogs.upsert({
    habitId,
    logDate: date,
    currentCount: habit.isQuantitative ? Math.max(progress.currentCount, habit.targetCount) : 1,
    status: 'completed',
  });
  return true;
}
