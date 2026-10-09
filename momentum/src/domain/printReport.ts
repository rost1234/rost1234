import { dayOfMonth, getWeekday, type LocalDateString, type Weekday } from '@/core/localDate';
import { buildCalendarDays, habitDayDetails, summarizeMonth, type HabitDayDetail } from './calendar';
import type { HeatCellState } from './analytics';
import type { DailyReflection, Habit, HabitLog, MoodScore, Pause, Task } from './models';

/** Everything the printed monthly report says, already translated. */
export interface ReportLabels {
  lang: string;
  dir: 'rtl' | 'ltr';
  title: string;
  generated: string;
  perfectDays: string;
  completion: string;
  freezes: string;
  pausedDays: string;
  habitsHeading: string;
  totalColumn: string;
  noHabits: string;
  legend: string;
  legendDone: string;
  legendPartial: string;
  legendFreeze: string;
  legendSkipped: string;
  legendPaused: string;
  legendMissed: string;
  /** One-letter mark for a day a streak freeze covered. */
  freezeMark: string;
  daysHeading: string;
  tasksHeading: string;
  taskDone: string;
  taskOpen: string;
  reflectionHeading: string;
  gratitude: string;
  lesson: string;
  sleep: (hours: number) => string;
  mood: (score: MoodScore) => string;
  habitsDone: (done: number, total: number) => string;
  weekdays: readonly [string, string, string, string, string, string, string];
}

export interface ReportInput {
  /** First day of the month. */
  month: LocalDateString;
  monthName: string;
  /** Every day of the month, in order. */
  dates: readonly LocalDateString[];
  today: LocalDateString;
  habits: readonly Habit[];
  logs: readonly HabitLog[];
  pauses: readonly Pause[];
  reflections: readonly DailyReflection[];
  tasks: readonly Task[];
  includeTasks: boolean;
  includeReflections: boolean;
  /** Printed under the title, e.g. the date the report was made. */
  generatedOn: string;
}

export const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const CELL: Partial<Record<HeatCellState, string>> = {
  completed: '<i class="dot full"></i>',
  partial: '<i class="dot half"></i>',
  skipped: '&ndash;',
  paused: '=',
  missed: '&middot;',
};

function cellMark(state: HeatCellState, labels: ReportLabels): string {
  if (state === 'forgiven') return `<i class="frz">${escapeHtml(labels.freezeMark)}</i>`;
  return CELL[state] ?? '';
}

const isDoneDay = (state: HeatCellState) => state === 'completed';

/** A black-and-white A4 page of the month: summary, a habit-by-day grid, and optional day-by-day notes. */
export function renderReportHtml(input: ReportInput, labels: ReportLabels): string {
  const { dates, today } = input;
  const habits = input.habits.filter((h) => !h.isArchived || input.logs.some((l) => l.habitId === h.id));
  const days = buildCalendarDays(input.habits, input.logs, input.pauses, dates, today);
  const summary = summarizeMonth(days);
  const logsByDate = new Map<LocalDateString, HabitDayDetail[]>(dates.map((date) => [date, habitDayDetails(habits, input.logs, input.pauses, date, today)]));

  const head = dates
    .map((date) => {
      const weekday = getWeekday(date) as Weekday;
      return `<th><b>${dayOfMonth(date)}</b><br>${escapeHtml(labels.weekdays[weekday])}</th>`;
    })
    .join('');

  const rows = habits
    .map((habit) => {
      let done = 0;
      let due = 0;
      const cells = dates
        .map((date) => {
          const detail = logsByDate.get(date)?.find((d) => d.habit.id === habit.id);
          if (!detail || date > today) return '<td></td>';
          if (detail.state !== 'skipped' && detail.state !== 'paused') due += 1;
          if (isDoneDay(detail.state)) done += 1;
          return `<td>${cellMark(detail.state, labels)}</td>`;
        })
        .join('');
      return `<tr><td class="name">${escapeHtml(habit.title)}</td>${cells}<td class="tot">${done}/${due}</td></tr>`;
    })
    .join('');

  const grid =
    habits.length === 0
      ? `<p>${escapeHtml(labels.noHabits)}</p>`
      : `<table class="grid"><thead><tr><th class="name"></th>${head}<th class="tot">${escapeHtml(labels.totalColumn)}</th></tr></thead><tbody>${rows}</tbody></table>`;

  const legend = [
    `<span><i class="dot full"></i> ${escapeHtml(labels.legendDone)}</span>`,
    `<span><i class="dot half"></i> ${escapeHtml(labels.legendPartial)}</span>`,
    `<span><i class="frz">${escapeHtml(labels.freezeMark)}</i> ${escapeHtml(labels.legendFreeze)}</span>`,
    `<span>&ndash; ${escapeHtml(labels.legendSkipped)}</span>`,
    `<span>= ${escapeHtml(labels.legendPaused)}</span>`,
    `<span>&middot; ${escapeHtml(labels.legendMissed)}</span>`,
  ].join('');

  const tasksByDate = new Map<LocalDateString, Task[]>();
  for (const task of input.tasks) {
    if (!task.dueDate) continue;
    tasksByDate.set(task.dueDate, [...(tasksByDate.get(task.dueDate) ?? []), task]);
  }
  const reflectionByDate = new Map(input.reflections.map((r) => [r.logDate, r] as const));

  const dayBlocks = dates
    .map((date) => {
      if (date > today) return '';
      const tasks = input.includeTasks ? (tasksByDate.get(date) ?? []) : [];
      const reflection = input.includeReflections ? reflectionByDate.get(date) : undefined;
      if (tasks.length === 0 && !reflection) return '';
      const details = logsByDate.get(date) ?? [];
      const counted = details.filter((d) => d.state !== 'skipped' && d.state !== 'paused');
      const done = counted.filter((d) => isDoneDay(d.state)).length;
      const parts: string[] = [];
      parts.push(
        `<h3>${dayOfMonth(date)} &middot; ${escapeHtml(labels.weekdays[getWeekday(date) as Weekday])}${
          counted.length > 0 ? ` <small>${escapeHtml(labels.habitsDone(done, counted.length))}</small>` : ''
        }</h3>`,
      );
      if (tasks.length > 0) {
        parts.push(
          `<p class="k">${escapeHtml(labels.tasksHeading)}</p><ul>${tasks
            .map((task) => `<li>${task.isCompleted ? '[x]' : '[ ]'} ${escapeHtml(task.title)} <small>(${escapeHtml(task.isCompleted ? labels.taskDone : labels.taskOpen)})</small></li>`)
            .join('')}</ul>`,
        );
      }
      if (reflection) {
        const lines = [escapeHtml(labels.mood(reflection.moodScore))];
        if (reflection.sleepMinutes) lines.push(escapeHtml(labels.sleep(Math.round((reflection.sleepMinutes / 60) * 10) / 10)));
        parts.push(`<p class="k">${escapeHtml(labels.reflectionHeading)}</p><p>${lines.join(' &middot; ')}</p>`);
        if (reflection.gratitudeText) parts.push(`<p><b>${escapeHtml(labels.gratitude)}:</b> ${escapeHtml(reflection.gratitudeText)}</p>`);
        if (reflection.lessonText) parts.push(`<p><b>${escapeHtml(labels.lesson)}:</b> ${escapeHtml(reflection.lessonText)}</p>`);
      }
      return `<section class="day">${parts.join('')}</section>`;
    })
    .join('');

  const stats = [
    [labels.perfectDays, String(summary.perfectDays)],
    [labels.completion, summary.averagePercent === null ? '-' : `${summary.averagePercent}%`],
    [labels.freezes, String(summary.freezesUsed)],
    [labels.pausedDays, String(summary.pausedDays)],
  ]
    .map(([label, value]) => `<div class="stat"><b>${escapeHtml(value ?? '')}</b><span>${escapeHtml(label ?? '')}</span></div>`)
    .join('');

  const css = `
@page { size: A4; margin: 12mm; }
* { box-sizing: border-box; color: #000; }
body { margin: 0; background: #fff; font-family: sans-serif; font-size: 11px; line-height: 1.45; }
h1 { font-size: 20px; margin: 0; }
h2 { font-size: 14px; margin: 16px 0 6px; border-bottom: 1px solid #000; padding-bottom: 2px; }
h3 { font-size: 12px; margin: 0 0 3px; }
small { font-weight: normal; font-size: 10px; }
.sub { margin: 2px 0 10px; font-size: 10px; }
.stats { display: flex; gap: 8px; margin-bottom: 4px; }
.stat { flex: 1; border: 1px solid #000; padding: 4px 6px; text-align: center; }
.stat b { display: block; font-size: 16px; }
.stat span { font-size: 9px; }
table.grid { border-collapse: collapse; width: 100%; table-layout: fixed; }
.grid th, .grid td { border: 0.5px solid #000; text-align: center; padding: 1px 0; font-size: 8px; height: 16px; }
.grid th b { font-size: 8px; }
.grid .name { width: 26%; text-align: start; padding: 1px 4px; font-size: 10px; overflow: hidden; }
.grid .tot { width: 8%; font-size: 9px; font-weight: bold; }
.dot { display: inline-block; width: 7px; height: 7px; border: 1px solid #000; border-radius: 50%; vertical-align: middle; }
.dot.full { background: #000; }
.dot.half { background: linear-gradient(to right, #000 50%, #fff 50%); }
.frz { display: inline-block; min-width: 9px; border: 1px solid #000; border-radius: 3px; font-style: normal; font-size: 8px; font-weight: bold; line-height: 9px; }
.legend { margin-top: 6px; font-size: 9px; display: flex; flex-wrap: wrap; gap: 4px 14px; }
.day { break-inside: avoid; page-break-inside: avoid; border-bottom: 0.5px solid #000; padding: 5px 0; }
.day p { margin: 1px 0; }
.day ul { margin: 1px 0; padding-inline-start: 16px; list-style: none; }
.k { font-size: 9px; font-weight: bold; text-decoration: underline; }
`;

  return `<!DOCTYPE html><html lang="${escapeHtml(labels.lang)}" dir="${labels.dir}"><head><meta charset="utf-8"><title>${escapeHtml(labels.title)} ${escapeHtml(input.monthName)}</title><style>${css}</style></head><body>
<h1>${escapeHtml(labels.title)} &middot; ${escapeHtml(input.monthName)}</h1>
<p class="sub">${escapeHtml(labels.generated)} ${escapeHtml(input.generatedOn)}</p>
<div class="stats">${stats}</div>
<h2>${escapeHtml(labels.habitsHeading)}</h2>
${grid}
<div class="legend">${legend}</div>
${dayBlocks ? `<h2>${escapeHtml(labels.daysHeading)}</h2>${dayBlocks}` : ''}
</body></html>`;
}
