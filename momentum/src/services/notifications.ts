import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { runDetached } from '@/core/errors';

const FOCUS_CHANNEL_ID = 'focus';
const REMINDER_CHANNEL_ID = 'reminders';
const REFLECTION_REMINDER_KEY = 'reflection-reminder';

let configured = false;

/** Call once at startup: foreground presentation + Android channels. */
export function configureNotifications(): void {
  if (configured) return;
  configured = true;

  Notifications.setNotificationHandler({
    handleNotification: () =>
      Promise.resolve({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
  });

  if (Platform.OS === 'android') {
    runDetached(
      Promise.all([
        Notifications.setNotificationChannelAsync(FOCUS_CHANNEL_ID, {
          name: 'Focus timer',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
          vibrationPattern: [0, 250, 250, 250],
        }),
        Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
          name: 'Reminders',
          importance: Notifications.AndroidImportance.DEFAULT,
        }),
      ]),
    );
  }
}

export type PermissionResult = 'granted' | 'denied' | 'unavailable';

export async function requestNotificationPermission(): Promise<PermissionResult> {
  if (Platform.OS === 'web') return 'unavailable';
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return 'granted';
    if (!current.canAskAgain) return 'denied';
    const next = await Notifications.requestPermissionsAsync();
    return next.granted ? 'granted' : 'denied';
  } catch {
    return 'unavailable';
  }
}

async function hasPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Schedules the "focus session complete" alert; returns its id (or null). */
export async function scheduleFocusCompleteNotification(endsAt: Date, minutes: number): Promise<string | null> {
  if (!(await hasPermission())) return null;
  const seconds = Math.max(1, Math.round((endsAt.getTime() - Date.now()) / 1000));
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Focus session complete 🎉',
      body: `${minutes} minutes of deep work. Take a short break.`,
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      channelId: FOCUS_CHANNEL_ID,
    },
  });
}

export async function cancelNotification(id: string | null): Promise<void> {
  if (!id || Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(id);
}

/** Daily evening nudge to do the 2-minute reflection (idempotent). */
export async function scheduleReflectionReminder(hour = 21, minute = 0): Promise<void> {
  if (!(await hasPermission())) return;
  await Notifications.cancelScheduledNotificationAsync(REFLECTION_REMINDER_KEY).catch(() => undefined);
  await Notifications.scheduleNotificationAsync({
    identifier: REFLECTION_REMINDER_KEY,
    content: { title: 'Evening check-in 🌙', body: 'Two minutes to reflect on your day.' },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: REMINDER_CHANNEL_ID,
    },
  });
}
