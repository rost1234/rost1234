import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { usePrefsStore } from '@/state/prefsStore';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';
const enabled = () => supported && usePrefsStore.getState().hapticsEnabled;

/** Fire-and-forget haptics; no-ops on web or when turned off in settings, and never throws. */
export const haptics = {
  tap: () => {
    if (enabled()) Haptics.selectionAsync().catch(() => {});
  },
  success: () => {
    if (enabled()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  warning: () => {
    if (enabled()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  },
};
