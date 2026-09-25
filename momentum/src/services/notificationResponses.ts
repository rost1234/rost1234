import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { runDetached } from '@/core/errors';
import { getLocalDeviceDate, isLocalDateString } from '@/core/localDate';
import { useHabitStore } from '@/state/habitStore';
import { refreshTodayWidget } from '@/widget/refreshWidget';
import { DONE_ACTION, DONE_ALL_ACTION, completeFromNotification } from './habitReminders';

function habitIdsOf(data: Record<string, unknown> | undefined): string[] {
  if (Array.isArray(data?.habitIds)) return data.habitIds.filter((id): id is string => typeof id === 'string');
  return typeof data?.habitId === 'string' ? [data.habitId] : [];
}

async function handle(response: Notifications.NotificationResponse): Promise<void> {
  if (response.actionIdentifier !== DONE_ACTION && response.actionIdentifier !== DONE_ALL_ACTION) return;
  const data = response.notification.request.content.data as Record<string, unknown> | undefined;
  const habitIds = habitIdsOf(data);
  if (habitIds.length === 0) return;
  const date = typeof data?.date === 'string' && isLocalDateString(data.date) ? data.date : getLocalDeviceDate();
  const source = data?.kind === 'checkin' ? 'checkin' : 'reminder';
  for (const habitId of habitIds) await completeFromNotification(habitId, date, source);
  await Notifications.dismissNotificationAsync(response.notification.request.identifier).catch(() => undefined);
  await Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
  const today = useHabitStore.getState().today;
  if (today) runDetached(useHabitStore.getState().load(today));
  refreshTodayWidget(0);
}

/**
 * "Done ✓" / "All done ✓" on a habit notification. Handled while the app is running, and — if the
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
