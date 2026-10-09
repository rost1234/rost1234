import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Height of Android's three-button navigation bar (dp), the tallest the system draws. */
const ANDROID_NAV_BAR = 48;
/** Breathing room above it. */
const BUFFER = 8;

/**
 * Space to leave at the bottom of the screen for the phone's back/home bar.
 * The app draws edge to edge, and some Android phones under-report that bar
 * (sometimes as 0), so on Android it is never less than the three-button bar,
 * plus a small buffer.
 */
export function useBottomInset(): number {
  const { bottom } = useSafeAreaInsets();
  return Platform.OS === 'android' ? Math.max(bottom, ANDROID_NAV_BAR) + BUFFER : bottom;
}
