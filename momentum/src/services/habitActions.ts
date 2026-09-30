import * as Notifications from 'expo-notifications';
import { getLocalDeviceDate, isLocalDateString } from '@/core/localDate';
import { habitActionTarget, notificationsToCancel } from '@/domain/notificationDone';
import { repositories } from '@/data/repositories';
import { refreshTodayWidget } from '@/widget/refreshWidget';
import { DONE_ACTION, DONE_ALL_ACTION, completeFromNotification } from './habitReminders';

export const isHabitAction = (response: Notifications.NotificationResponse) =>
  response.actionIdentifier === DONE_ACTION || response.actionIdentifier === DONE_ALL_ACTION;

/**
 * "Done ✓" / "All done ✓" on a habit notification, from the in-app listener or the
 * headless background task. The notification closes first, so the tap feels
 * instant even while the database write runs. Returns true when it handled it.
 */
export async function handleHabitAction(response: Notifications.NotificationResponse): Promise<boolean> {
  if (!isHabitAction(response)) return false;
  await Notifications.dismissNotificationAsync(response.notification.request.identifier).catch(() => undefined);

  const data = response.notification.request.content.data as Record<string, unknown> | undefined;
  const target = habitActionTarget(data);
  if (target.habitIds.length === 0) return true;
  const date = typeof target.date === 'string' && isLocalDateString(target.date) ? target.date : getLocalDeviceDate();
  const source = target.kind === 'checkin' ? 'checkin' : 'reminder';
  for (const habitId of target.habitIds) await completeFromNotification(habitId, date, source);
  await Notifications.clearLastNotificationResponseAsync().catch(() => undefined);

  // A habit that is done shouldn't be asked about again later today (rescue, check-in).
  const done = new Set<string>();
  for (const log of await repositories.habitLogs.getForDate(date)) if (log.status === 'completed') done.add(log.habitId);
  const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  const stale = notificationsToCancel(
    scheduled.map((n) => ({ identifier: n.identifier, data: n.content.data as Record<string, unknown> | undefined })),
    done,
    date,
  );
  await Promise.all(stale.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));

  refreshTodayWidget(0);
  return true;
}
