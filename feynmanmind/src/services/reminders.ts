import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { currentTranslator } from '@/i18n';

const CHANNEL_ID = 'daily-review';
const REMINDER_ID = 'daily-review-reminder';

export const remindersSupported = Platform.OS === 'ios' || Platform.OS === 'android';

/** Shows reminders as banners even when the app is open. Call once at startup. */
export function configureNotifications(): void {
  if (!remindersSupported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export type PermissionResult = 'granted' | 'denied' | 'unsupported';

export async function ensureNotificationPermission(): Promise<PermissionResult> {
  if (!remindersSupported) return 'unsupported';
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: currentTranslator()('settings.reminders'),
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  if (!current.canAskAgain) return 'denied';
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted ? 'granted' : 'denied';
}

/**
 * (Re)schedules the single daily reminder, or cancels it. Idempotent: always
 * replaces the previous one, so it also refreshes the text after a language change.
 */
export async function syncDailyReminder(enabled: boolean, hour: number): Promise<void> {
  if (!remindersSupported) return;
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});
  if (!enabled) return;

  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;

  const t = currentTranslator();
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: { title: t('notif.title'), body: t('notif.body') },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute: 0,
      channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
    },
  });
}
