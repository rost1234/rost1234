import type { LocalDateString } from '@/core/localDate';

export interface ScheduledHabitNotification {
  identifier: string;
  data: Record<string, unknown> | undefined;
}

function habitIdsOf(data: Record<string, unknown> | undefined): string[] {
  if (Array.isArray(data?.habitIds)) return data.habitIds.filter((id): id is string => typeof id === 'string');
  return typeof data?.habitId === 'string' ? [data.habitId] : [];
}

/**
 * A notification's data. In the Android headless task, local notifications carry
 * it as a JSON string (`dataString`) instead of `data`; the in-app listener gets `data`.
 */
export function notificationData(content: Record<string, unknown> | undefined | null): Record<string, unknown> | undefined {
  const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
  if (isRecord(content?.data)) return content.data;
  if (typeof content?.dataString !== 'string') return undefined;
  try {
    const parsed: unknown = JSON.parse(content.dataString);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/** Habit ids and day carried by a habit notification's data (older notifications carried a single `habitId`). */
export function habitActionTarget(data: Record<string, unknown> | undefined): { habitIds: string[]; date: unknown; kind: unknown } {
  return { habitIds: habitIdsOf(data), date: data?.date, kind: data?.kind };
}

/**
 * Scheduled (or shown) notifications that became pointless once `doneIds` were completed on
 * `date`: every habit they ask about is done. Notifications with other habits
 * still open, other days, or no habits (morning plan, reflection) stay.
 */
export function notificationsToCancel(
  scheduled: readonly ScheduledHabitNotification[],
  doneIds: ReadonlySet<string>,
  date: LocalDateString,
): string[] {
  return scheduled
    .filter(({ data }) => {
      const ids = habitIdsOf(data);
      return data?.date === date && ids.length > 0 && ids.every((id) => doneIds.has(id));
    })
    .map((n) => n.identifier);
}
