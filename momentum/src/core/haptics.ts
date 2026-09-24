import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Tiny tactile confirmations. Never throws, never blocks the UI. */
export const haptics = {
  tap(): void {
    if (Platform.OS === 'web') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  },
  select(): void {
    if (Platform.OS === 'web') return;
    Haptics.selectionAsync().catch(() => undefined);
  },
  success(): void {
    if (Platform.OS === 'web') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  },
};
