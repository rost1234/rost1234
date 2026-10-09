import { addDays, dayOfMonth, getWeekday, monthDays, monthGrid, type LocalDateString } from '@/core/localDate';
import { isHabitDueOn } from './habitSchedule';
import type { Habit, TimeOfDay } from './models';
import { accentFor, printPalette, type PrintPalette } from './printPalette';
import { escapeHtml } from './printReport';
import { orderByStacking } from './stacking';

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
  /** Section names for the "by time of day" layout. */
  timeOfDay: Readonly<Record<TimeOfDay, string>>;
  /** "After {anchor}" for a stacked habit. */
  after: (anchor: string) => string;
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
  /** Colorful (the app's Calm colors) or black and white. */
  color: boolean;
  labels: SheetLabels;
}

export interface Sheet {
  html: string;
  landscape: boolean;
}

/** The ways to lay habits out on a page. */
export type SheetKind = 'monthRows' | 'monthColumns' | 'monthByTime' | 'monthCards' | 'week' | 'day' | 'calendar';

export const SHEET_KINDS: readonly SheetKind[] = ['monthRows', 'monthColumns', 'monthByTime', 'monthCards', 'week', 'day', 'calendar'];

const MIN_ROWS = { month: 12, week: 8, day: 8, columns: 8 } as const;
const LAST_SLEEP = 10;
const FIRST_SLEEP = 4;
const TIME_ORDER: readonly TimeOfDay[] = ['morning', 'afternoon', 'evening', 'any'];

const e = escapeHtml;
const rule = (count: number) => Array.from({ length: count }, () => '<div class="ln"></div>').join('');
/** Digits and signs stay left-to-right inside a right-to-left page ("10+", not "+10"). */
const circle = (text: string, color?: string) =>
  `<i class="ci" dir="ltr"${color ? ` style="border-color:${color};color:${color}"` : ''}>${e(text)}</i>`;
const box = (extra = '', color?: string) => `<i class="bx ${extra}"${color ? ` style="border-color:${color}"` : ''}></i>`;

const isWeekend = (date: LocalDateString) => {
  const day = getWeekday(date);
  return day === 5 || day === 6;
};

function shell(title: string, body: string, labels: SheetLabels, landscape: boolean, p: PrintPalette, extraCss = ''): string {
  const css = `
@page { size: ${landscape ? 'A4 landscape' : 'A4'}; margin: 10mm; }
* { box-sizing: border-box; color: ${p.ink}; }
body { margin: 0; background: #fff; font-family: sans-serif; font-size: 11px; line-height: 1.4; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
h1 { font-size: 19px; margin: 0; }
h2 { font-size: 13px; margin: 12px 0 5px; border-bottom: 1px solid ${p.line}; padding-bottom: 2px; }
.how { font-size: 9.5px; margin: 3px 0 8px; color: ${p.muted}; }
.page { break-after: page; page-break-after: always; }
.page:last-child { break-after: auto; page-break-after: auto; }
.bx { display: inline-block; width: 14px; height: 14px; border: 1.3px solid ${p.line}; border-radius: 3px; vertical-align: middle; background: #fff; }
.bx.big { width: 20px; height: 20px; border-radius: 4px; }
.ci { display: inline-block; min-width: 17px; height: 17px; border: 1px solid ${p.line}; border-radius: 50%; text-align: center; font-style: normal; font-size: 9px; line-height: 15px; margin: 0 1px; background: #fff; }
.ln { border-bottom: 0.8px solid ${p.line}; height: 21px; }
table { border-collapse: collapse; width: 100%; table-layout: fixed; }
th, td { border: 0.6px solid ${p.line}; text-align: center; padding: 0; }
th { background: ${p.headBg}; color: ${p.headFg}; }
th * { color: ${p.headFg}; }
td.name, th.name { text-align: start; padding: 0 5px; font-size: 10.5px; overflow: hidden; white-space: nowrap; }
td.name { background: #fff; }
.grey { background: ${p.weekend}; }
th.grey { background: ${p.weekendHead}; }
th small { color: ${p.headFg}; }
.off { background: repeating-linear-gradient(45deg, #fff, #fff 2px, ${p.offStripe} 2px, ${p.offStripe} 3px); }
.group td { background: ${p.isColor ? p.soft : '#f0f0f0'}; font-weight: bold; text-align: start; padding: 2px 6px; font-size: 10px; }
.tag { font-size: 8px; border: 0.8px solid ${p.line}; border-radius: 3px; padding: 0 3px; margin-inline-start: 4px; }
small { font-size: 9px; color: ${p.muted}; }
${extraCss}`;
  return `<!DOCTYPE html><html lang="${e(labels.lang)}" dir="${labels.dir}"><head><meta charset="utf-8"><title>${e(title)}</title><style>${css}</style></head><body>${body}</body></html>`;
}

const habitName = (habit: Habit, labels: SheetLabels) =>
  `${e(habit.title)}${habit.isQuit ? `<span class="tag">${e(labels.quitTag)}</span>` : ''}`;

const howTo = (habits: readonly Habit[], labels: SheetLabels) =>
  `<p class="how">${e(labels.howTo)}${habits.some((h) => h.isQuit) ? ` ${e(labels.howToQuit)}` : ''}</p>`;

/** The line under a habit's name: what it is anchored to, its cue and step, or its target. */
function habitNote(habit: Habit, all: readonly Habit[], labels: SheetLabels): string {
  if (habit.isQuantitative) return labels.countNote(habit);
  const anchor = habit.afterHabitId ? all.find((h) => h.id === habit.afterHabitId) : undefined;
  return [anchor ? labels.after(anchor.title) : '', habit.cue, habit.microStep].filter(Boolean).join(' · ');
}

/** A colored stripe at the start of a habit's name cell, so a row can be found across 31 columns. */
const stripe = (p: PrintPalette, index: number) => (p.isColor ? `border-inline-start:5px solid ${accentFor(p, index)};` : '');

/** A month grid: a header row of days, then groups of habits (optionally with a heading each). */
function monthTable(
  groups: readonly { heading?: string; habits: readonly Habit[] }[],
  allHabits: readonly Habit[],
  dates: readonly LocalDateString[],
  blankRows: number,
  labels: SheetLabels,
  p: PrintPalette,
): string {
  const head = dates
    .map(
      (date) =>
        `<th class="${isWeekend(date) ? 'grey' : ''}"><b>${dayOfMonth(date)}</b><br><small>${e(labels.weekdayInitials[getWeekday(date)] ?? '')}</small></th>`,
    )
    .join('');
  const cells = (habit: Habit | null) =>
    dates
      .map((date) => {
        const off = habit && !isHabitDueOn(habit, date);
        return `<td class="${off ? 'off' : isWeekend(date) ? 'grey' : ''}"></td>`;
      })
      .join('');
  const rows = groups
    .map((group) => {
      const heading = group.heading ? `<tr class="group"><td colspan="${dates.length + 1}">${e(group.heading)}</td></tr>` : '';
      const body = group.habits
        .map(
          (habit) =>
            `<tr style="height:30px"><td class="name" style="${stripe(p, allHabits.indexOf(habit))}">${habitName(habit, labels)}</td>${cells(habit)}</tr>`,
        )
        .join('');
      return heading + body;
    })
    .join('');
  const blanks = Array.from({ length: blankRows }, () => `<tr style="height:30px"><td class="name"></td>${cells(null)}</tr>`).join('');
  return `<table><thead><tr><th class="name" style="width:24%">${e(labels.habits)}</th>${head}</tr></thead><tbody>${rows}${blanks}</tbody></table>`;
}

const notesBlock = (labels: SheetLabels, lines: number) => `<h2>${e(labels.notes)}</h2>${rule(lines)}`;

/** Layout 1: habits are rows, days are columns; one page for the month. */
export function renderMonthRows(input: SheetInput): Sheet {
  const { labels, habits } = input;
  const p = printPalette(input.color);
  const body = `<h1>${e(labels.monthSheetTitle)} &middot; ${e(input.monthName)}</h1>${howTo(habits, labels)}
${monthTable([{ habits }], habits, monthDays(input.start), Math.max(0, MIN_ROWS.month - habits.length), labels, p)}${notesBlock(labels, 8)}`;
  return { html: shell(labels.monthSheetTitle, body, labels, false, p), landscape: false };
}

/** Layout 2: days run down the page, habits are columns. Roomy for a handful of habits. */
export function renderMonthColumns(input: SheetInput): Sheet {
  const { labels, habits } = input;
  const p = printPalette(input.color);
  const dates = monthDays(input.start);
  const blanks = Math.max(0, MIN_ROWS.columns - habits.length);
  const head = [
    ...habits.map(
      (habit, i) =>
        `<th style="font-size:9px;padding:3px 2px;line-height:1.2;${p.isColor ? `border-bottom:4px solid ${accentFor(p, i)};` : ''}">${habitName(habit, labels)}</th>`,
    ),
    ...Array.from({ length: blanks }, () => '<th></th>'),
  ].join('');
  const rows = dates
    .map((date) => {
      const weekend = isWeekend(date);
      const cells = [
        ...habits.map((habit) => `<td class="${!isHabitDueOn(habit, date) ? 'off' : weekend ? 'grey' : ''}"></td>`),
        ...Array.from({ length: blanks }, () => `<td class="${weekend ? 'grey' : ''}"></td>`),
      ].join('');
      return `<tr style="height:25px"><td class="name ${weekend ? 'grey' : ''}" style="font-size:10px"><b>${dayOfMonth(date)}</b> <small>${e(labels.weekdayInitials[getWeekday(date)] ?? '')}</small></td>${cells}</tr>`;
    })
    .join('');
  const body = `<h1>${e(labels.monthSheetTitle)} &middot; ${e(input.monthName)}</h1>${howTo(habits, labels)}
<table><thead><tr><th class="name" style="width:10%"></th>${head}</tr></thead><tbody>${rows}</tbody></table>`;
  return { html: shell(labels.monthSheetTitle, body, labels, false, p), landscape: false };
}

/** Layout 3: the rows grouped by the part of the day each habit belongs to, in stacking order within a group. */
export function renderMonthByTime(input: SheetInput): Sheet {
  const { labels, habits } = input;
  const p = printPalette(input.color);
  const groups = TIME_ORDER.map((slot) => ({
    heading: labels.timeOfDay[slot],
    habits: orderByStacking(habits.filter((h) => h.timeOfDay === slot)),
  })).filter((group) => group.habits.length > 0);
  const body = `<h1>${e(labels.monthSheetTitle)} &middot; ${e(input.monthName)}</h1>${howTo(habits, labels)}
${monthTable(groups, habits, monthDays(input.start), 3, labels, p)}${notesBlock(labels, 6)}`;
  return { html: shell(labels.monthSheetTitle, body, labels, false, p), landscape: false };
}

/** Layout 4: a small card per habit holding its own month, a circle per day laid out like a calendar. */
export function renderMonthCards(input: SheetInput): Sheet {
  const { labels, habits } = input;
  const p = printPalette(input.color);
  const grid = monthGrid(input.start);
  const head = [0, 1, 2, 3, 4, 5, 6].map((d) => `<span class="cw">${e(labels.weekdayInitials[d] ?? '')}</span>`).join('');
  const card = (habit: Habit | null, index: number) => {
    const color = habit ? accentFor(p, index) : p.line;
    const note = habit ? habitNote(habit, habits, labels) : '';
    const days = grid
      .flat()
      .map((date) => {
        if (!date) return '<span class="cd"></span>';
        const off = habit && !isHabitDueOn(habit, date);
        return `<span class="cd">${off ? `<i class="ci" dir="ltr" style="border-color:#999;color:#999;border-style:dashed">${dayOfMonth(date)}</i>` : circle(String(dayOfMonth(date)), color)}</span>`;
      })
      .join('');
    return `<div class="card" style="${p.isColor ? `border-top:5px solid ${color};` : ''}"><div class="ct">${habit ? habitName(habit, labels) : '&nbsp;'}</div><small>${note ? e(note) : '&nbsp;'}</small><div class="cg">${head}${days}</div></div>`;
  };
  const blanks = habits.length % 2 === 1 ? 1 : 0;
  const cards = [...habits.map(card), ...Array.from({ length: blanks }, () => card(null, 0))].join('');
  const extra = `
.cards { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.card { border: 1px solid ${p.line}; border-radius: 6px; padding: 6px 8px; break-inside: avoid; page-break-inside: avoid; background: ${p.soft}; }
.ct { font-size: 12.5px; font-weight: bold; }
.cg { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px 2px; margin-top: 5px; text-align: center; }
.cw { font-size: 8px; color: ${p.muted}; }
.cd { text-align: center; }
.cd .ci { margin: 0; }
`;
  const body = `<h1>${e(labels.monthSheetTitle)} &middot; ${e(input.monthName)}</h1>${howTo(habits, labels)}<div class="cards">${cards}</div>`;
  return { html: shell(labels.monthSheetTitle, body, labels, false, p, extra), landscape: false };
}

/** Week sheet: habits for seven days, three tasks a day, mood, sleep, gratitude and a lesson. */
export function renderWeekSheet(input: SheetInput): Sheet {
  const { labels, habits } = input;
  const p = printPalette(input.color);
  const dates = Array.from({ length: 7 }, (_, i) => addDays(input.start, i));
  const head = dates
    .map((date) => `<th class="${isWeekend(date) ? 'grey' : ''}"><b>${e(labels.weekdayNames[getWeekday(date)] ?? '')}</b><br>${dayOfMonth(date)}</th>`)
    .join('');
  const habitRow = (habit: Habit | null, index: number) =>
    `<tr style="height:34px"><td class="name" style="${stripe(p, index)}">${habit ? habitName(habit, labels) : ''}</td>${dates
      .map((date) => `<td class="${habit && !isHabitDueOn(habit, date) ? 'off' : ''}"></td>`)
      .join('')}</tr>`;
  const blanks = Math.max(0, MIN_ROWS.week - habits.length);
  const taskCells = dates
    .map(
      (date) =>
        `<td class="${isWeekend(date) ? 'grey' : ''}" style="padding:3px 3px;text-align:start;vertical-align:top">${[0, 1, 2]
          .map(() => `<div style="height:24px;border-bottom:0.6px solid ${p.line};display:flex;align-items:flex-end;gap:3px;padding-bottom:2px">${box()}</div>`)
          .join('')}</td>`,
    )
    .join('');
  const moodCells = dates
    .map(
      () =>
        `<td style="padding:6px 0;height:34px;white-space:nowrap"><span style="display:inline-block;transform:scale(0.78);transform-origin:center">${[1, 2, 3, 4, 5].map((n) => circle(String(n))).join('')}</span></td>`,
    )
    .join('');
  const sleepCells = dates.map(() => `<td style="height:28px"></td>`).join('');
  const body = `<h1>${e(labels.weekSheetTitle)} &middot; ${e(labels.dateLabel(dates[0] ?? input.start))} &ndash; ${e(labels.dateLabel(dates[6] ?? input.start))}</h1>${howTo(habits, labels)}
<table><thead><tr><th class="name" style="width:24%">${e(labels.habits)}</th>${head}</tr></thead><tbody>${habits.map(habitRow).join('')}${Array.from({ length: blanks }, () => habitRow(null, 0)).join('')}</tbody></table>
<h2>${e(labels.tasks)}</h2><table><tbody><tr>${taskCells}</tr></tbody></table>
<h2>${e(labels.mood)} &middot; ${e(labels.sleep)}</h2>
<table><tbody><tr><td class="name" style="width:24%">${e(labels.mood)}<br><small>1 = ${e(labels.moods[0] ?? '')}, 5 = ${e(labels.moods[4] ?? '')}</small></td>${moodCells}</tr><tr><td class="name">${e(labels.sleep)}</td>${sleepCells}</tr></tbody></table>
<h2>${e(labels.gratitude)}</h2>${rule(2)}
<h2>${e(labels.lesson)}</h2>${rule(2)}`;
  return { html: shell(labels.weekSheetTitle, body, labels, false, p), landscape: false };
}

/** A full page for each day, as many days as asked (a week by default). */
export function renderDaySheets(input: SheetInput): Sheet {
  const { labels, habits } = input;
  const p = printPalette(input.color);
  const count = input.days ?? 7;
  const blanks = Math.max(0, MIN_ROWS.day - habits.length);
  const habitRow = (habit: Habit | null, index: number) => {
    const note = habit ? habitNote(habit, habits, labels) : '';
    return `<div style="display:flex;align-items:center;gap:10px;border-bottom:0.6px solid ${p.line};padding:5px 0;min-height:32px;${stripe(p, index)}${p.isColor ? 'padding-inline-start:8px;' : ''}">${box('big', p.isColor ? accentFor(p, index) : undefined)}<div style="flex:1">${habit ? `<b style="font-size:13px">${habitName(habit, labels)}</b>${note ? `<br><small>${e(note)}</small>` : ''}` : ''}</div></div>`;
  };
  const pages = Array.from({ length: count }, (_, i) => {
    const date = addDays(input.start, i);
    const rows =
      habits.map((habit, index) => (isHabitDueOn(habit, date) ? habitRow(habit, index) : '')).join('') +
      Array.from({ length: blanks }, () => habitRow(null, 0)).join('');
    const sleeps = Array.from({ length: LAST_SLEEP - FIRST_SLEEP + 1 }, (_, n) =>
      circle(n === 0 ? `≤${FIRST_SLEEP}` : n === LAST_SLEEP - FIRST_SLEEP ? `${LAST_SLEEP}+` : String(FIRST_SLEEP + n)),
    ).join(' ');
    const moods = labels.moods
      .map((word, n) => `<span style="display:inline-block;text-align:center;margin:0 6px">${circle(String(n + 1))}<br><small>${e(word)}</small></span>`)
      .join('');
    return `<section class="page"><h1>${e(labels.dateLabel(date))}</h1>${howTo(habits, labels)}
<h2>${e(labels.habits)}</h2>${rows}
<h2>${e(labels.tasks)}</h2>${[0, 1, 2].map(() => `<div style="display:flex;align-items:flex-end;gap:8px;border-bottom:0.8px solid ${p.line};height:30px;padding-bottom:3px">${box('big')}</div>`).join('')}
<h2>${e(labels.mood)}</h2><div>${moods}</div>
<h2>${e(labels.sleep)}</h2><div>${sleeps}</div>
<h2>${e(labels.gratitude)}</h2>${rule(2)}
<h2>${e(labels.lesson)}</h2>${rule(2)}</section>`;
  }).join('');
  return { html: shell(labels.daySheetTitle, pages, labels, false, p), landscape: false };
}

/** A wall calendar (landscape): each day holds one numbered box per habit, and the numbers are listed beside it. */
export function renderCalendarSheet(input: SheetInput): Sheet {
  const { labels, habits } = input;
  const p = printPalette(input.color);
  const grid = monthGrid(input.start);
  const small = habits.length > 8;
  const size = small ? 11 : 14;
  const legend = habits
    .map(
      (habit, i) =>
        `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">${circle(String(i + 1), p.isColor ? accentFor(p, i) : undefined)}<span>${habitName(habit, labels)}</span></div>`,
    )
    .join('');
  const head = [0, 1, 2, 3, 4, 5, 6]
    .map((d) => `<th class="${d === 5 || d === 6 ? 'grey' : ''}" style="height:20px">${e(labels.weekdayNames[d] ?? '')}</th>`)
    .join('');
  const rows = grid
    .map(
      (week) =>
        `<tr>${week
          .map((date, col) => {
            if (!date) return '<td></td>';
            const boxes = habits
              .map((habit, i) => {
                const color = p.isColor ? accentFor(p, i) : p.line;
                return isHabitDueOn(habit, date)
                  ? `<i class="bx" style="width:${size}px;height:${size}px;border-color:${color};color:${color};font-style:normal;font-size:${small ? 7 : 8}px;line-height:${size - 2}px;text-align:center" dir="ltr">${i + 1}</i>`
                  : `<i class="bx off" style="width:${size}px;height:${size}px;border-color:#999"></i>`;
              })
              .join('');
            return `<td class="${col === 5 || col === 6 ? 'grey' : ''}" style="height:${grid.length > 5 ? 74 : 88}px;vertical-align:top;text-align:start;padding:3px 4px"><b style="font-size:12px">${dayOfMonth(date)}</b><div style="display:flex;flex-wrap:wrap;gap:2px;margin-top:3px">${boxes}</div></td>`;
          })
          .join('')}</tr>`,
    )
    .join('');
  const body = `<div style="display:flex;gap:14px;align-items:flex-start"><div style="flex:1"><h1>${e(labels.calendarSheetTitle)} &middot; ${e(input.monthName)}</h1><p class="how">${e(labels.howTo)}</p>
<table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>
<div style="width:150px"><h2 style="margin-top:0">${e(labels.habitLegend)}</h2>${legend}<h2>${e(labels.notes)}</h2>${rule(6)}</div></div>`;
  return { html: shell(labels.calendarSheetTitle, body, labels, true, p), landscape: true };
}

export const SHEET_RENDERERS: Record<SheetKind, (input: SheetInput) => Sheet> = {
  monthRows: renderMonthRows,
  monthColumns: renderMonthColumns,
  monthByTime: renderMonthByTime,
  monthCards: renderMonthCards,
  week: renderWeekSheet,
  day: renderDaySheets,
  calendar: renderCalendarSheet,
};
