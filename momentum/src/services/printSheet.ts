import * as Print from 'expo-print';
import { formatLongDate, monthLabel, weekdayLabel, weekdayName, type LocalDateString, type Weekday } from '@/core/localDate';
import type { Habit } from '@/domain/models';
import { SHEET_RENDERERS, sheetStart, type CalendarFields, type SheetKind, type SheetLabels, type SheetPeriod } from '@/domain/printSheets';
import type { Translator } from '@/i18n';

const HEBREW_INITIALS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
/** A4 at 72 ppi (the unit expo-print sizes pages in). */
const PORTRAIT = { width: 595, height: 842 } as const;

function sheetLabels(t: Translator): SheetLabels {
  const days = [0, 1, 2, 3, 4, 5, 6] as Weekday[];
  return {
    lang: t.language,
    dir: t.isRTL ? 'rtl' : 'ltr',
    weekdayInitials: t.isRTL ? HEBREW_INITIALS : days.map((d) => [...weekdayLabel(d, t.locale)].slice(0, 2).join('')),
    weekdayNames: days.map((d) => weekdayName(d, t.locale)),
    howTo: t('sheet.howTo'),
    howToQuit: t('sheet.howToQuit'),
    habits: t('cal.habitsTitle'),
    tasks: t('sheet.tasks'),
    mood: t('cal.mood2'),
    moods: [1, 2, 3, 4, 5].map((n) => t(`mood.${n}` as 'mood.1')),
    sleep: t('sheet.sleep'),
    gratitude: t('sheet.gratitude'),
    lesson: t('cal.lesson'),
    notes: t('sheet.notes'),
    did: t('sheet.did'),
    day: t('sheet.day'),
    quitTag: t('sheet.quitTag'),
    monthSheetTitle: t('sheet.titleMonth'),
    weekSheetTitle: t('sheet.titleWeek'),
    daySheetTitle: t('sheet.titleDay'),
    calendarSheetTitle: t('sheet.titleCalendar'),
    habitLegend: t('sheet.legend'),
    timeOfDay: { morning: t('rhythm.morning'), afternoon: t('rhythm.afternoon'), evening: t('rhythm.evening'), any: t('rhythm.any') },
    after: (anchor) => t('sheet.after', { anchor }),
    countNote: (habit) => `${habit.targetCount}${habit.unit ? ` ${habit.unit}` : ''}`,
    dateLabel: (date) => formatLongDate(date, t.locale),
  };
}

export type { SheetPeriod };

export interface SheetRequest {
  kind: SheetKind;
  period: SheetPeriod;
  today: LocalDateString;
  habits: readonly Habit[];
  color: boolean;
  fields: CalendarFields;
  t: Translator;
}

/** Opens the system print dialog with an empty sheet to fill in by hand. */
export async function printSheet(request: SheetRequest): Promise<void> {
  const { t } = request;
  const start = sheetStart(request.kind, request.period, request.today);
  const sheet = SHEET_RENDERERS[request.kind]({
    habits: request.habits,
    start,
    monthName: monthLabel(start, t.locale),
    color: request.color,
    fields: request.fields,
    labels: sheetLabels(t),
  });
  await Print.printAsync(sheet.landscape ? { html: sheet.html, width: PORTRAIT.height, height: PORTRAIT.width } : { html: sheet.html, ...PORTRAIT });
}
