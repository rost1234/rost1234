import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { getLocalDeviceDate, isLocalDateString, type LocalDateString } from '@/core/localDate';
import { habitActionTarget, notificationData, notificationsToCancel } from '@/domain/notificationDone';
import { repositories } from '@/data/repositories';
import { refreshTodayWidget } from '@/widget/refreshWidget';
import { DONE_ACTION, DONE_ALL_ACTION, completeFromNotification } from './habitReminders';

/** When a "Done ✓" tap was last handled, and where (shown in Settings → Notifications). */
export const LAST_HABIT_ACTION_KEY = 'momentum.lastHabitAction';
export interface LastHabitAction {
  at: string;
  via: 'background' | 'app';
  ok: boolean;
}

export const isHabitAction = (response: Pick<Notifications.NotificationResponse, 'actionIdentifier'>) =>
  response.actionIdentifier === DONE_ACTION || response.actionIdentifier === DONE_ALL_ACTION;

const quietly = async <T>(work: () => Promise<T>): Promise<T | undefined> => {
  try {
    return await work();
  } catch {
    return undefined;
  }
};

async function doneHabitIds(date: LocalDateString): Promise<Set<string>> {
  const done = new Set<string>();
  for (const log of await repositories.habitLogs.getForDate(date)) if (log.status === 'completed') done.add(log.habitId);
  return done;
}

type WithContent = { identifier: string; content: Record<string, unknown> };
const asDataList = (items: readonly WithContent[]) =>
  items.map((n) => ({ identifier: n.identifier, data: notificationData(n.content) }));

/**
 * Closes the shown notifications, and cancels the scheduled ones, that only ask
 * about habits already done on `date`. Also run when the app opens, so a done
 * habit never leaves a notification behind.
 */
export async function clearDoneHabitNotifications(date: LocalDateString): Promise<void> {
  const done = await doneHabitIds(date);
  if (done.size === 0) return;

  const presented = (await quietly(() => Notifications.getPresentedNotificationsAsync())) ?? [];
  const shown = notificationsToCancel(
    asDataList(presented.map((n) => ({ identifier: n.request.identifier, content: n.request.content as unknown as Record<string, unknown> }))),
    done,
    date,
  );
  await Promise.all(shown.map((id) => quietly(() => Notifications.dismissNotificationAsync(id))));

  const scheduled = (await quietly(() => Notifications.getAllScheduledNotificationsAsync())) ?? [];
  const stale = notificationsToCancel(
    asDataList(scheduled.map((n) => ({ identifier: n.identifier, content: n.content as unknown as Record<string, unknown> }))),
    done,
    date,
  );
  await Promise.all(stale.map((id) => quietly(() => Notifications.cancelScheduledNotificationAsync(id))));
}

interface HabitActionInput {
  actionIdentifier: string;
  notification: { request: { identifier: string; content: unknown } };
}

/**
 * "Done ✓" / "All done ✓" on a habit notification, from the in-app listener or the
 * headless background task. The notification closes first, so the tap feels
 * instant even while the database write runs. Each step stands alone, so one
 * failure doesn't keep the notification on screen. Returns true when it handled it.
 */
export async function handleHabitAction(response: HabitActionInput, via: LastHabitAction['via'] = 'app'): Promise<boolean> {
  if (!isHabitAction(response)) return false;
  const { identifier, content } = response.notification.request;
  await quietly(() => Notifications.dismissNotificationAsync(identifier));

  const target = habitActionTarget(notificationData(content as Record<string, unknown> | undefined));
  const date = typeof target.date === 'string' && isLocalDateString(target.date) ? target.date : getLocalDeviceDate();
  const source = target.kind === 'checkin' ? 'checkin' : 'reminder';
  let ok = target.habitIds.length > 0;
  for (const habitId of target.habitIds) {
    if ((await quietly(() => completeFromNotification(habitId, date, source))) === undefined) ok = false;
  }
  await quietly(() => Notifications.clearLastNotificationResponseAsync());
  await quietly(() => clearDoneHabitNotifications(date));
  refreshTodayWidget(0);

  const record: LastHabitAction = { at: new Date().toISOString(), via, ok };
  await quietly(() => AsyncStorage.setItem(LAST_HABIT_ACTION_KEY, JSON.stringify(record)));
  return true;
}
