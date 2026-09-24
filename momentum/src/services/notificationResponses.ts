import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { runDetached } from '@/core/errors';
import { getLocalDeviceDate, isLocalDateString } from '@/core/localDate';
import { useHabitStore } from '@/state/habitStore';
import { refreshTodayWidget } from '@/widget/refreshWidget';
import { DONE_ACTION, completeFromNotification } from './habitReminders';

async function handle(response: Notifications.NotificationResponse): Promise<void> {
  if (response.actionIdentifier !== DONE_ACTION) return;
  const data = response.notification.request.content.data as Record<string, unknown> | undefined;
  const habitId = typeof data?.habitId === 'string' ? data.habitId : null;
  if (!habitId) return;
  const date = typeof data?.date === 'string' && isLocalDateString(data.date) ? data.date : getLocalDeviceDate();
  await completeFromNotification(habitId, date);
  await Notifications.dismissNotificationAsync(response.notification.request.identifier).catch(() => undefined);
  await Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
  const today = useHabitStore.getState().today;
  if (today) runDetached(useHabitStore.getState().load(today));
  refreshTodayWidget(0);
}

/**
 * "Done ✓" on a habit reminder. Handled while the app is running, and — if the
 * tap happened while it was closed — the next time it opens.
 */
export function startNotificationResponses(): () => void {
  if (Platform.OS === 'web') return () => undefined;
  const subscription = Notifications.addNotificationResponseReceivedListener((r) => runDetached(handle(r)));
  runDetached(
    Notifications.getLastNotificationResponseAsync().then((r) => {
      if (r) return handle(r);
      return undefined;
    }),
  );
  return () => subscription.remove();
}
