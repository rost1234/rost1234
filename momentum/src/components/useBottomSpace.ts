import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Empty space after the last item, so the end of a list never hides under the nav bar or a floating button. */
export const BOTTOM_BUFFER = 96;

/** The Garden look's bottom dock (72) and the gap under it: lists and toasts leave this much room. */
export const DOCK_CLEARANCE = 88;

/** Bottom padding for scrolling screens: system navigation inset + buffer (+ `extra` for floating controls). */
export function useBottomSpace(extra = 0): number {
  return useSafeAreaInsets().bottom + BOTTOM_BUFFER + extra;
}
