import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { runDetached } from '@/core/errors';
import { parseLocalDate, type LocalDateString } from '@/core/localDate';
import { repositories } from '@/data/repositories';
import { progressOf } from '@/domain/habitProgress';
import type { Habit, HabitLog } from '@/domain/models';
import { reminderDates, usualReminderMinutes } from '@/domain/rhythm';
import { t } from '@/i18n';
import { hasPermission } from './notifications';

export const HABIT_REMINDER_CATEGORY = 'habit-reminder';
export const DONE_ACTION = 'done';
const REMINDER_CHANNEL_ID = 'reminders';
const idPrefix = (habitId: string) => `habit-${habitId}-`;

/** Registers the "Done ✓" button shown on habit reminders (idempotent). */
export async function registerReminderCategory(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.setNotificationCategoryAsync(HABIT_REMINDER_CATEGORY, [
    { identifier: DONE_ACTION, buttonTitle: t('remind.doneButton'), options: { opensAppToForeground: false } },
  ]);
}

async function cancelForHabit(habitId: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const request of scheduled) {
    if (request.identifier.startsWith(idPrefix(habitId))) {
      await Notifications.cancelScheduledNotificationAsync(request.identifier).catch(() => undefined);
    }
  }
}

/**
 * Smart reminders: for the next 7 scheduled days, one reminder at the time the
 * habit is usually done — skipped for today once it's done. Re-synced on every
 * app open and habit change, so it adapts to the user's real rhythm.
 */
export async function syncHabitReminders(
  habits: readonly Habit[],
  logsByHabit: Readonly<Record<string, Readonly<Record<LocalDateString, HabitLog>>>>,
  today: LocalDateString,
): Promise<void> {
  if (Platform.OS === 'web') return;
  const allowed = await hasPermission();
  for (const habit of habits) {
    await cancelForHabit(habit.id);
    if (!allowed || habit.reminder !== 'smart' || habit.isArchived) continue;
    const logs = Object.values(logsByHabit[habit.id] ?? {}).sort((a, b) => a.logDate.localeCompare(b.logDate));
    const minutes = usualReminderMinutes(habit, logs);
    const doneToday = progressOf(logsByHabit[habit.id]?.[today]).status === 'completed';
    for (const date of reminderDates(habit, today, doneToday)) {
      const when = parseLocalDate(date);
      when.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
      if (when.getTime() <= Date.now() + 60_000) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: `${idPrefix(habit.id)}${date}`,
        content: {
          title: habit.title,
          body: habit.microStep || habit.why || t('remind.defaultBody'),
          categoryIdentifier: HABIT_REMINDER_CATEGORY,
          data: { habitId: habit.id, date },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: REMINDER_CHANNEL_ID },
      });
    }
  }
}

/** Cancels today's reminder once the habit is done (fire-and-forget). */
export function cancelTodaysReminder(habitId: string, today: LocalDateString): void {
  if (Platform.OS === 'web') return;
  runDetached(Notifications.cancelScheduledNotificationAsync(`${idPrefix(habitId)}${today}`));
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
