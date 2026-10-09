/**
 * The paper plan for one month: which lesson to learn on which day, and when
 * each one comes back for review (+1, +3, +7 and +14 days — spaced repetition
 * on paper). Pure: the screen gathers the stations and the lessons, this lays
 * them out, html.ts draws the pages.
 */
import type { LessonParts } from '@/content/lesson';

/** Spaced reviews after learning, in days. */
export const REVIEW_OFFSETS = [1, 3, 7, 14] as const;

export interface PlanStation {
  courseId: string;
  courseTitle: string;
  key: string;
  title: string;
  unit?: string;
  /** The lesson to print; null when it isn't written yet (printed as title and summary). */
  parts: LessonParts | null;
  /** Plain lesson text, for lessons without parts. */
  text: string;
  summary: string;
  cards: { question: string; answer: string }[];
}

export interface PlannedStation extends PlanStation {
  /** 1-based number on the sheet. */
  n: number;
  learn: string;
  /** Review dates (YYYY-MM-DD), or null when it falls after the month. */
  reviews: (string | null)[];
}

export interface PlanOptions {
  year: number;
  /** 0-based month. */
  month: number;
  /** Weekdays you learn on (0 = Sunday … 6 = Saturday). */
  studyDays: number[];
  /** New lessons per learning day. */
  perDay: number;
  /** A day without anything (Saturday by default); reviews that land on it move to the next day. */
  restDay?: number | null;
  /** Friday is a weekly self-test day by default. */
  quizDay?: number | null;
}

export interface MonthPlan {
  year: number;
  month: number;
  days: { date: string; weekday: number; learn: number[]; review: number[]; quiz: boolean; rest: boolean }[];
  stations: PlannedStation[];
}

const pad = (n: number) => String(n).padStart(2, '0');
export const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** How many lessons fit in the month with these options. */
export function lessonSlots(opts: PlanOptions): number {
  const count = new Date(opts.year, opts.month + 1, 0).getDate();
  let slots = 0;
  for (let d = 1; d <= count; d++) if (opts.studyDays.includes(new Date(opts.year, opts.month, d).getDay())) slots += opts.perDay;
  return slots;
}

export function planMonth(stations: PlanStation[], opts: PlanOptions): MonthPlan {
  const restDay = opts.restDay === undefined ? 6 : opts.restDay;
  const quizDay = opts.quizDay === undefined ? 5 : opts.quizDay;
  const count = new Date(opts.year, opts.month + 1, 0).getDate();
  const days: MonthPlan['days'] = Array.from({ length: count }, (_, i) => {
    const date = new Date(opts.year, opts.month, i + 1);
    const weekday = date.getDay();
    return { date: isoDay(date), weekday, learn: [], review: [], quiz: weekday === quizDay, rest: weekday === restDay && !opts.studyDays.includes(weekday) };
  });
  const byDate = new Map(days.map((d) => [d.date, d]));
  const planned: PlannedStation[] = [];
  let next = 0;
  for (const day of days) {
    if (!opts.studyDays.includes(day.weekday)) continue;
    for (let k = 0; k < opts.perDay && next < stations.length; k++) {
      const n = planned.length + 1;
      const start = new Date(`${day.date}T12:00:00`);
      const reviews = REVIEW_OFFSETS.map((offset) => {
        const r = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset);
        if (r.getDay() === restDay) r.setDate(r.getDate() + 1);
        const key = isoDay(r);
        const target = byDate.get(key);
        if (!target) return null;
        target.review.push(n);
        return key;
      });
      day.learn.push(n);
      planned.push({ ...stations[next]!, n, learn: day.date, reviews });
      next++;
    }
  }
  for (const d of days) d.review.sort((a, b) => a - b);
  return { year: opts.year, month: opts.month, days, stations: planned };
}
