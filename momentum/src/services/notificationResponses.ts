import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { runDetached } from '@/core/errors';
import { useHabitStore } from '@/state/habitStore';
import { getLocalDeviceDate } from '@/core/localDate';
import { clearDoneHabitNotifications, handleHabitAction } from './habitActions';

async function handle(response: Notifications.NotificationResponse): Promise<void> {
  if (!(await handleHabitAction(response))) return;
  const today = useHabitStore.getState().today;
  if (today) runDetached(useHabitStore.getState().load(today));
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
  // A done habit shouldn't leave a notification behind, even if the tap wasn't handled in the background.
  const sweep = () => runDetached(clearDoneHabitNotifications(getLocalDeviceDate()));
  sweep();
  const appState = AppState.addEventListener('change', (state) => {
    if (state === 'active') sweep();
  });
  return () => {
    subscription.remove();
    appState.remove();
  };
}
