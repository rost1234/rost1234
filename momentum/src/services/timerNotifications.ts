import { projectedEndDate, type PersistedTimer } from '@/domain/focusTimer';
import { upcomingPhaseEnds } from '@/domain/pomodoro';
import { cancelNotification, scheduleFocusCompleteNotification, scheduleFocusNotification } from './notifications';

type TimerNotifications = Pick<PersistedTimer, 'notificationId' | 'extraNotificationIds'>;

/**
 * Schedules every alert the running timer will need: one for a single session,
 * or one per phase change for a Pomodoro (so they fire even if the app is closed).
 */
export async function scheduleTimerNotifications(timer: PersistedTimer): Promise<TimerNotifications> {
  if (!timer.pomodoro) {
    const notificationId = await scheduleFocusCompleteNotification(projectedEndDate(timer), timer.targetDurationMinutes);
    return { notificationId, extraNotificationIds: [] };
  }
  const ids: string[] = [];
  for (const { at, ending } of upcomingPhaseEnds(timer)) {
    const isLast = ending.phase === 'work' && ending.cycle >= ending.totalCycles;
    const id = isLast
      ? await scheduleFocusNotification(at, 'Pomodoro complete 🎉', `${ending.totalCycles} focus blocks done. Great work.`)
      : ending.phase === 'work'
        ? await scheduleFocusNotification(at, `Break time ☕ (${ending.cycle}/${ending.totalCycles})`, `Step away for ${ending.breakMinutes} minutes.`)
        : await scheduleFocusNotification(at, 'Back to focus 🎯', `Block ${ending.cycle + 1} of ${ending.totalCycles} starts now.`);
    if (id) ids.push(id);
  }
  const [first, ...rest] = ids;
  return { notificationId: first ?? null, extraNotificationIds: rest };
}

export async function cancelTimerNotifications(timer: TimerNotifications): Promise<void> {
  await cancelNotification(timer.notificationId);
  for (const id of timer.extraNotificationIds ?? []) await cancelNotification(id);
}
