import { addDays, dayOfMonth, getWeekday, monthDays, monthGrid, type LocalDateString } from '@/core/localDate';
import { isHabitDueOn } from './habitSchedule';
import type { Habit } from './models';
import { escapeHtml } from './printReport';

/** Text on the blank sheets, already translated. */
export interface SheetLabels {
  lang: string;
  dir: 'rtl' | 'ltr';
  /** One letter per weekday, Sunday first. */
  weekdayInitials: readonly string[];
  /** Full weekday names, Sunday first. */
  weekdayNames: readonly string[];
  howTo: string;
  howToQuit: string;
  habits: string;
  tasks: string;
  mood: string;
  /** Five mood words, worst to best. */
  moods: readonly string[];
  sleep: string;
  gratitude: string;
  lesson: string;
  notes: string;
  /** Printed beside a habit to quit. */
  quitTag: string;
  monthSheetTitle: string;
  weekSheetTitle: string;
  daySheetTitle: string;
  calendarSheetTitle: string;
  habitLegend: string;
  /** "{n} glasses" style note for counted habits. */
  countNote: (habit: Habit) => string;
  /** A date as the sheet's heading, e.g. "יום שלישי, 6 באוקטובר". */
  dateLabel: (date: LocalDateString) => string;
}

export interface SheetInput {
  habits: readonly Habit[];
  /** Month sheets and calendars: any day of the month. Week and day sheets: the first day. */
  start: LocalDateString;
  monthName: string;
  /** Day sheets: how many consecutive days (one page each). */
  days?: number;
  labels: SheetLabels;
}

export interface Sheet {
  html: string;
  landscape: boolean;
}

export type SheetKind = 'month' | 'week' | 'day' | 'calendar';

const MIN_ROWS = { month: 12, week: 8, day: 8 } as const;
const LAST_SLEEP = 10;
const FIRST_SLEEP = 4;

const e = escapeHtml;
const box = (extra = '') => `<i class="bx ${extra}"></i>`;
const rule = (count: number) => Array.from({ length: count }, () => '<div class="ln"></div>').join('');
/** Digits and signs stay left-to-right inside a right-to-left page ("10+", not "+10"). */
const circle = (text: string) => `<i class="ci" dir="ltr">${e(text)}</i>`;

/** Friday and Saturday columns get a light grey so the weekend reads at a glance. */
const isWeekend = (date: LocalDateString) => {
  const day = getWeekday(date);
  return day === 5 || day === 6;
};

function shell(title: string, body: string, labels: SheetLabels, landscape: boolean): string {
  const css = `
@page { size: ${landscape ? 'A4 landscape' : 'A4'}; margin: 10mm; }
* { box-sizing: border-box; color: #000; }
body { margin: 0; background: #fff; font-family: sans-serif; font-size: 11px; line-height: 1.4; }
h1 { font-size: 19px; margin: 0; }
h2 { font-size: 13px; margin: 12px 0 5px; border-bottom: 1px solid #000; padding-bottom: 2px; }
.how { font-size: 9.5px; margin: 3px 0 8px; }
.page { break-after: page; page-break-after: always; }
.page:last-child { break-after: auto; page-break-after: auto; }
.bx { display: inline-block; width: 14px; height: 14px; border: 1.3px solid #000; border-radius: 3px; vertical-align: middle; }
.bx.big { width: 20px; height: 20px; border-radius: 4px; }
.ci { display: inline-block; min-width: 17px; height: 17px; border: 1px solid #000; border-radius: 50%; text-align: center; font-style: normal; font-size: 9px; line-height: 15px; margin: 0 1px; }
.ln { border-bottom: 0.8px solid #000; height: 21px; }
table { border-collapse: collapse; width: 100%; table-layout: fixed; }
th, td { border: 0.6px solid #000; text-align: center; padding: 0; }
td.name, th.name { text-align: start; padding: 0 5px; font-size: 10.5px; overflow: hidden; white-space: nowrap; }
.grey { background: #e4e4e4; }
.off { background: repeating-linear-gradient(45deg, #fff, #fff 2px, #d0d0d0 2px, #d0d0d0 3px); }
.tag { font-size: 8px; border: 0.8px solid #000; border-radius: 3px; padding: 0 3px; margin-inline-start: 4px; }
small { font-size: 9px; }
`;
  return `<!DOCTYPE html><html lang="${e(labels.lang)}" dir="${labels.dir}"><head><meta charset="utf-8"><title>${e(title)}</title><style>${css}</style></head><body>${body}</body></html>`;
}

const habitName = (habit: Habit, labels: SheetLabels) =>
  `${e(habit.title)}${habit.isQuit ? `<span class="tag">${e(labels.quitTag)}</span>` : ''}`;

const howTo = (habits: readonly Habit[], labels: SheetLabels) =>
  `<p class="how">${e(labels.howTo)}${habits.some((h) => h.isQuit) ? ` ${e(labels.howToQuit)}` : ''}</p>`;

/** Option 1: one page for the month, a row per habit and a box per day. */
export function renderMonthSheet(input: SheetInput): Sheet {
  const { labels, habits } = input;
  const dates = monthDays(input.start);
  const head = dates
    .map((date) => `<th class="${isWeekend(date) ? 'grey' : ''}"><b>${dayOfMonth(date)}</b><br><small>${e(labels.weekdayInitials[getWeekday(date)] ?? '')}</small></th>`)
    .join('');
  const row = (habit: Habit | null) =>
    `<tr style="height:30px"><td class="name">${habit ? habitName(habit, labels) : ''}</td>${dates
      .map((date) => {
        const off = habit && !isHabitDueOn(habit, date);
        return `<td class="${off ? 'off' : isWeekend(date) ? 'grey' : ''}"></td>`;
      })
      .join('')}</tr>`;
  const blanks = Math.max(0, MIN_ROWS.month - habits.length);
  const body = `<h1>${e(labels.monthSheetTitle)} &middot; ${e(input.monthName)}</h1>${howTo(habits, labels)}
<table><thead><tr><th class="name" style="width:24%">${e(labels.habits)}</th>${head}</tr></thead><tbody>${habits.map(row).join('')}${Array.from({ length: blanks }, () => row(null)).join('')}</tbody></table>
<h2>${e(labels.notes)}</h2>${rule(8)}`;
  return { html: shell(labels.monthSheetTitle, body, labels, false), landscape: false };
}

/** Option 2: one page for the week with habits, three tasks a day, mood, sleep, gratitude and a lesson. */
export function renderWeekSheet(input: SheetInput): Sheet {
  const { labels, habits } = input;
  const dates = Array.from({ length: 7 }, (_, i) => addDays(input.start, i));
  const head = dates
    .map((date) => `<th class="${isWeekend(date) ? 'grey' : ''}"><b>${e(labels.weekdayNames[getWeekday(date)] ?? '')}</b><br>${dayOfMonth(date)}</th>`)
    .join('');
  const habitRow = (habit: Habit | null) =>
    `<tr style="height:34px"><td class="name">${habit ? habitName(habit, labels) : ''}</td>${dates
      .map((date) => `<td class="${habit && !isHabitDueOn(habit, date) ? 'off' : ''}"></td>`)
      .join('')}</tr>`;
  const blanks = Math.max(0, MIN_ROWS.week - habits.length);
  const taskCells = dates
    .map((date) => `<td class="${isWeekend(date) ? 'grey' : ''}" style="padding:3px 3px;text-align:start;vertical-align:top">${[0, 1, 2]
      .map(() => `<div style="height:24px;border-bottom:0.6px solid #000;display:flex;align-items:flex-end;gap:3px;padding-bottom:2px">${box()}</div>`)
      .join('')}</td>`)
    .join('');
  const moodCells = dates
    .map(() => `<td style="padding:6px 0;height:34px;white-space:nowrap"><span style="display:inline-block;transform:scale(0.78);transform-origin:center">${[1, 2, 3, 4, 5].map((n) => circle(String(n))).join('')}</span></td>`)
    .join('');
  const sleepCells = dates.map(() => `<td style="height:28px"></td>`).join('');
  const body = `<h1>${e(labels.weekSheetTitle)} &middot; ${e(labels.dateLabel(dates[0] ?? input.start))} &ndash; ${e(labels.dateLabel(dates[6] ?? input.start))}</h1>${howTo(habits, labels)}
<table><thead><tr><th class="name" style="width:24%">${e(labels.habits)}</th>${head}</tr></thead><tbody>${habits.map(habitRow).join('')}${Array.from({ length: blanks }, () => habitRow(null)).join('')}</tbody></table>
<h2>${e(labels.tasks)}</h2><table><tbody><tr>${taskCells}</tr></tbody></table>
<h2>${e(labels.mood)} &middot; ${e(labels.sleep)}</h2>
<table><tbody><tr><td class="name" style="width:24%">${e(labels.mood)}<br><small>1 = ${e(labels.moods[0] ?? '')}, 5 = ${e(labels.moods[4] ?? '')}</small></td>${moodCells}</tr><tr><td class="name">${e(labels.sleep)}</td>${sleepCells}</tr></tbody></table>
<h2>${e(labels.gratitude)}</h2>${rule(2)}
<h2>${e(labels.lesson)}</h2>${rule(2)}`;
  return { html: shell(labels.weekSheetTitle, body, labels, false), landscape: false };
}

/** Option 3: a full page for each day, as many days as asked (a week by default). */
export function renderDaySheets(input: SheetInput): Sheet {
  const { labels, habits } = input;
  const count = input.days ?? 7;
  const blanks = Math.max(0, MIN_ROWS.day - habits.length);
  const habitRow = (habit: Habit | null) => {
    const note = habit ? (habit.isQuantitative ? labels.countNote(habit) : habit.microStep) : '';
    return `<div style="display:flex;align-items:center;gap:10px;border-bottom:0.6px solid #000;padding:5px 0;min-height:32px">${box('big')}<div style="flex:1">${habit ? `<b style="font-size:13px">${habitName(habit, labels)}</b>${note ? `<br><small>${e(note)}</small>` : ''}` : ''}</div></div>`;
  };
  const pages = Array.from({ length: count }, (_, i) => {
    const date = addDays(input.start, i);
    const due = habits.filter((habit) => isHabitDueOn(habit, date));
    const rows = due.map(habitRow).join('') + Array.from({ length: blanks }, () => habitRow(null)).join('');
    const sleeps = Array.from({ length: LAST_SLEEP - FIRST_SLEEP + 1 }, (_, n) => circle(n === 0 ? `≤${FIRST_SLEEP}` : n === LAST_SLEEP - FIRST_SLEEP ? `${LAST_SLEEP}+` : String(FIRST_SLEEP + n))).join(' ');
    const moods = labels.moods.map((word, n) => `<span style="display:inline-block;text-align:center;margin:0 6px">${circle(String(n + 1))}<br><small>${e(word)}</small></span>`).join('');
    return `<section class="page"><h1>${e(labels.dateLabel(date))}</h1>${howTo(habits, labels)}
<h2>${e(labels.habits)}</h2>${rows}
<h2>${e(labels.tasks)}</h2>${[0, 1, 2].map(() => `<div style="display:flex;align-items:flex-end;gap:8px;border-bottom:0.8px solid #000;height:30px;padding-bottom:3px">${box('big')}</div>`).join('')}
<h2>${e(labels.mood)}</h2><div>${moods}</div>
<h2>${e(labels.sleep)}</h2><div>${sleeps}</div>
<h2>${e(labels.gratitude)}</h2>${rule(2)}
<h2>${e(labels.lesson)}</h2>${rule(2)}</section>`;
  }).join('');
  return { html: shell(labels.daySheetTitle, pages, labels, false), landscape: false };
}

/** Option 4: a wall calendar (landscape); each day holds one numbered box per habit, and the numbers are listed beside it. */
export function renderCalendarSheet(input: SheetInput): Sheet {
  const { labels, habits } = input;
  const grid = monthGrid(input.start);
  const small = habits.length > 8;
  const size = small ? 11 : 14;
  const legend = habits
    .map((habit, i) => `<div style="display:flex;align-items:center;gap:6px;margin:2px 0"><i class="ci" style="min-width:18px">${i + 1}</i><span>${habitName(habit, labels)}</span></div>`)
    .join('');
  const head = [0, 1, 2, 3, 4, 5, 6].map((d) => `<th class="${d === 5 || d === 6 ? 'grey' : ''}" style="height:20px">${e(labels.weekdayNames[d] ?? '')}</th>`).join('');
  const rows = grid
    .map((week) => `<tr>${week
      .map((date, col) => {
        if (!date) return '<td></td>';
        const boxes = habits
          .map((habit, i) => (isHabitDueOn(habit, date) ? `<i class="bx" style="width:${size}px;height:${size}px;font-style:normal;font-size:${small ? 7 : 8}px;line-height:${size - 2}px;text-align:center">${i + 1}</i>` : `<i class="bx off" style="width:${size}px;height:${size}px;border-color:#888"></i>`))
          .join('');
        return `<td class="${(col === 5 || col === 6) ? 'grey' : ''}" style="height:${grid.length > 5 ? 74 : 88}px;vertical-align:top;text-align:start;padding:3px 4px"><b style="font-size:12px">${dayOfMonth(date)}</b><div style="display:flex;flex-wrap:wrap;gap:2px;margin-top:3px">${boxes}</div></td>`;
      })
      .join('')}</tr>`)
    .join('');
  const body = `<div style="display:flex;gap:14px;align-items:flex-start"><div style="flex:1"><h1>${e(labels.calendarSheetTitle)} &middot; ${e(input.monthName)}</h1><p class="how">${e(labels.howTo)}</p>
<table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>
<div style="width:150px"><h2 style="margin-top:0">${e(labels.habitLegend)}</h2>${legend}<h2>${e(labels.notes)}</h2>${rule(6)}</div></div>`;
  return { html: shell(labels.calendarSheetTitle, body, labels, true), landscape: true };
}

export const SHEET_RENDERERS: Record<SheetKind, (input: SheetInput) => Sheet> = {
  month: renderMonthSheet,
  week: renderWeekSheet,
  day: renderDaySheets,
  calendar: renderCalendarSheet,
};
