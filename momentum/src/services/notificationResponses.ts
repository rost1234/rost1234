import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { runDetached } from '@/core/errors';
import { useHabitStore } from '@/state/habitStore';
import { handleHabitAction } from './habitActions';

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
  return () => subscription.remove();
}
