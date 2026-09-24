import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { toErrorMessage } from '@/core/errors';
import { renderTodayWidget, TODAY_WIDGET_NAME, TOGGLE_HABIT_ACTION } from './TodayWidget';
import { loadTodayWidgetModel, tapHabitFromWidget } from './widgetData';
import { rowsForHeight } from './widgetModel';

/**
 * Runs headlessly when the launcher adds, refreshes, resizes or taps the
 * widget — the app UI does not need to be open.
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  const { widgetInfo, widgetAction, clickAction, clickActionData, renderWidget } = props;
  if (widgetInfo.widgetName !== TODAY_WIDGET_NAME) return;

  try {
    switch (widgetAction) {
      case 'WIDGET_DELETED':
        return;
      case 'WIDGET_CLICK': {
        const habitId = clickActionData?.habitId;
        if (clickAction === TOGGLE_HABIT_ACTION && typeof habitId === 'string') {
          await tapHabitFromWidget(habitId);
        }
        break;
      }
      case 'WIDGET_ADDED':
      case 'WIDGET_UPDATE':
      case 'WIDGET_RESIZED':
        break;
    }
    renderWidget(renderTodayWidget(await loadTodayWidgetModel(rowsForHeight(widgetInfo.height))));
  } catch (error) {
    if (__DEV__) console.warn('[Momentum widget]', toErrorMessage(error));
  }
}
