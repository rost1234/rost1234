import { weekdayLabel } from '@/core/localDate';
import { ALL_WEEKDAYS } from '@/domain/models';
import type { Translator } from '@/i18n';
import { TIMES, type HabitDraft } from './draft';

type T = Translator;

/** "10 pages" or "Once a day". */
export const amountText = (draft: HabitDraft, t: T): string =>
  draft.isQuantitative ? `${draft.targetCount} ${draft.unit}`.trim() : t('hf.oncePerDay');

/** "Every day" or "Sun, Tue, Thu". */
export function daysText(draft: HabitDraft, t: T): string {
  if (draft.targetFrequency !== 'specific_days' || draft.targetDays.length === 0 || draft.targetDays.length === 7) return t('form.everyDay');
  return ALL_WEEKDAYS.filter((d) => draft.targetDays.includes(d))
    .map((d) => weekdayLabel(d, t.locale))
    .join(' ');
}

export const timeText = (draft: HabitDraft, t: T): string => t(TIMES.find((p) => p.id === draft.timeOfDay)?.key ?? 'rhythm.any');

/** One line that says what will be saved: "Every day · Once a day · Any time". */
export const summaryLine = (draft: HabitDraft, t: T): string => [daysText(draft, t), amountText(draft, t), timeText(draft, t)].join(' · ');
