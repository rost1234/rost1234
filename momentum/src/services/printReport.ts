import * as Print from 'expo-print';
import { formatLongDate, monthDays, monthLabel, weekdayLabel, type LocalDateString, type Weekday } from '@/core/localDate';
import { repositories } from '@/data/repositories';
import type { DailyReflection, Habit, HabitLog, Pause } from '@/domain/models';
import { renderReportHtml, type ReportLabels } from '@/domain/printReport';
import { MOOD_OPTIONS } from '@/features/reflection/mood';
import type { Translator } from '@/i18n';

/** A4 at 72 ppi, the unit expo-print sizes pages in. */
const PAGE = { width: 595, height: 842 } as const;

function reportLabels(t: Translator): ReportLabels {
  return {
    lang: t.language,
    dir: t.isRTL ? 'rtl' : 'ltr',
    title: t('print.title'),
    generated: t('print.generated'),
    perfectDays: t('cal.statPerfect'),
    completion: t('cal.statCompletion'),
    freezes: t('cal.statFreezes'),
    pausedDays: t('cal.statPaused'),
    habitsHeading: t('cal.habitsTitle'),
    totalColumn: t('print.total'),
    noHabits: t('print.noHabits'),
    legend: '',
    legendDone: t('print.done'),
    legendPartial: t('print.partial'),
    legendFreeze: t('print.freeze'),
    legendSkipped: t('print.skipped'),
    legendPaused: t('print.paused'),
    legendMissed: t('print.missed'),
    freezeMark: t('print.freezeMark'),
    daysHeading: t('print.days'),
    tasksHeading: t('cal.tasksTitle'),
    taskDone: t('cal.taskDone'),
    taskOpen: t('cal.taskOpen'),
    reflectionHeading: t('cal.reflectionTitle'),
    gratitude: t('cal.gratitude'),
    lesson: t('cal.lesson'),
    sleep: (hours) => t('cal.sleep', { hours }),
    mood: (score) => {
      const option = MOOD_OPTIONS.find((m) => m.score === score);
      return t('refl.moodA11y', { label: option ? t(option.label) : '', score });
    },
    habitsDone: (done, total) => t('cal.dayDone', { done, total }),
    weekdays: [0, 1, 2, 3, 4, 5, 6].map((d) => weekdayLabel(d as Weekday, t.locale)) as unknown as ReportLabels['weekdays'],
  };
}

export interface MonthReportRequest {
  month: LocalDateString;
  today: LocalDateString;
  habits: readonly Habit[];
  logs: readonly HabitLog[];
  pauses: readonly Pause[];
  reflections: readonly DailyReflection[];
  /** Only this habit, or all of them. */
  habitId: string | null;
  includeTasks: boolean;
  includeReflections: boolean;
  t: Translator;
}

/** Opens the system print dialog (print, or save as PDF) with a black-and-white report of the month. */
export async function printMonthReport(request: MonthReportRequest): Promise<void> {
  const { month, today, t } = request;
  const dates = monthDays(month);
  const first = dates[0] ?? month;
  const last = dates[dates.length - 1] ?? month;
  const tasks = request.includeTasks
    ? (await repositories.tasks.getAll()).filter((task) => task.dueDate !== null && task.dueDate >= first && task.dueDate <= last)
    : [];
  const html = renderReportHtml(
    {
      month,
      monthName: monthLabel(month, t.locale),
      dates,
      today,
      habits: request.habitId ? request.habits.filter((h) => h.id === request.habitId) : request.habits,
      logs: request.logs,
      pauses: request.pauses,
      reflections: request.includeReflections ? request.reflections : [],
      tasks,
      includeTasks: request.includeTasks,
      includeReflections: request.includeReflections,
      generatedOn: formatLongDate(today, t.locale),
    },
    reportLabels(t),
  );
  await Print.printAsync({ html, width: PAGE.width, height: PAGE.height });
}
