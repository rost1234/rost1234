import { runDetached } from '@/core/errors';
import { getLocalDeviceDate, type LocalDateString } from '@/core/localDate';
import { INSIGHTS } from '@/content/insights';
import { repositories } from '@/data/repositories';
import { pickMoment, type InsightTriggerId } from '@/domain/insightPicker';
import { useNotebookStore, type MomentReason } from '@/state/notebookStore';
import { usePrefsStore } from '@/state/prefsStore';

/** Which research fits each moment. */
const TRIGGER: Record<MomentReason, InsightTriggerId> = {
  notToday: 'streak_broken',
  lowMood: 'low_mood',
  focusStopped: 'missed_focus',
  newHabit: 'new_habit',
};

/**
 * Something just happened that a study speaks to (a habit set aside for today, a heavy day in the
 * reflection, a focus session stopped early, a new habit): the Garden sprout tells one fitting
 * card next time Today is in view. At most one such card a day, on top of the morning's. Never throws.
 */
export async function offerMoment(reason: MomentReason, today: LocalDateString = getLocalDeviceDate()): Promise<void> {
  if (usePrefsStore.getState().look !== 'garden') return;
  if (useNotebookStore.getState().moment?.date === today) return;
  const shown = await repositories.shownInsights.getAll().catch(() => null);
  if (!shown) return;
  const card = pickMoment(INSIGHTS, TRIGGER[reason], today, shown);
  // Another moment may have landed while the list loaded.
  if (!card || useNotebookStore.getState().moment?.date === today) return;
  const notebook = useNotebookStore.getState();
  notebook.setMoment({ id: card.id, date: today, reason, dismissed: false });
  notebook.note(card.id, today, reason);
  await repositories.shownInsights.markShown(card.id, today).catch(() => undefined);
}

export const offerMomentLater = (reason: MomentReason, today?: LocalDateString): void => runDetached(offerMoment(reason, today));
