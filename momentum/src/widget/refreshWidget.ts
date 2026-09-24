import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { runDetached } from '@/core/errors';
import { QUICK_FOCUS_MINUTES } from '@/services/quickActionConfig';
import { FOCUS_WIDGET_NAME, renderFocusWidget } from './FocusWidget';
import { loadFocusWidgetModel } from './focusWidgetData';
import { renderTodayWidget, TODAY_WIDGET_NAME } from './TodayWidget';
import { loadTodayWidgetModel } from './widgetData';
import { rowsForHeight } from './widgetModel';

let pending: ReturnType<typeof setTimeout> | null = null;

/**
 * Re-renders any Today widgets on the home screen. Debounced so a burst of
 * taps in the app causes one widget refresh. No-op outside Android.
 */
export function refreshTodayWidget(delayMs = 400): void {
  if (Platform.OS !== 'android') return;
  if (pending) clearTimeout(pending);
  pending = setTimeout(() => {
    pending = null;
    runDetached(
      requestWidgetUpdate({
        widgetName: TODAY_WIDGET_NAME,
        renderWidget: async (info) => renderTodayWidget(await loadTodayWidgetModel(rowsForHeight(info.height))),
      }),
    );
  }, delayMs);
}

/** Re-renders the Focus widget after the app starts, pauses or ends a session. */
export function refreshFocusWidget(): void {
  if (Platform.OS !== 'android') return;
  runDetached(
    requestWidgetUpdate({
      widgetName: FOCUS_WIDGET_NAME,
      renderWidget: async () => renderFocusWidget(await loadFocusWidgetModel(), QUICK_FOCUS_MINUTES),
    }),
  );
}
