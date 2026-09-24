import { createTimer } from '@/domain/focusTimer';
import { QUICK_FOCUS_MINUTES } from '@/services/quickActionConfig';
import { scheduleTimerNotifications } from '@/services/timerNotifications';
import { loadTimer, saveTimer } from '@/services/timerStorage';
import { currentLocale } from '@/i18n';
import { buildFocusWidgetModel, type FocusWidgetModel } from './focusWidgetModel';

export async function loadFocusWidgetModel(): Promise<FocusWidgetModel> {
  return buildFocusWidgetModel(await loadTimer(), new Date(), currentLocale());
}

/**
 * Starts a plain session from the widget without opening the app, through the
 * same persisted timer + scheduled notification the app uses. Sound starts
 * once the app is opened. Never overwrites an existing (even finished, unlogged) session.
 */
export async function startFocusFromWidget(): Promise<void> {
  const existing = await loadTimer();
  if (existing) return;
  const timer = createTimer(QUICK_FOCUS_MINUTES, { habitId: null, taskId: null });
  await saveTimer(timer);
  await saveTimer({ ...timer, ...(await scheduleTimerNotifications(timer)) });
}
