import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { handleHabitAction } from './habitActions';

/**
 * On Android, "Done ✓" is pressed without opening the app. This headless task
 * receives that tap even when the app is closed, so the habit is saved and the
 * notification closes right away (the in-app listener only runs while the app
 * is alive).
 */
export const HABIT_ACTION_TASK = 'momentum-habit-action';

TaskManager.defineTask<Notifications.NotificationTaskPayload>(HABIT_ACTION_TASK, async ({ data }) => {
  if (data && 'actionIdentifier' in data) await handleHabitAction(data, 'background').catch(() => undefined);
  return Notifications.BackgroundNotificationTaskResult.NoData;
});

/** Call once from the entry point (module scope), before any screen mounts. Safe to repeat. */
export function registerHabitActionTask(): void {
  if (Platform.OS !== 'android') return;
  TaskManager.isTaskRegisteredAsync(HABIT_ACTION_TASK)
    .then((registered) => (registered ? undefined : Notifications.registerTaskAsync(HABIT_ACTION_TASK)))
    .catch(() => Notifications.registerTaskAsync(HABIT_ACTION_TASK).catch(() => undefined));
}
