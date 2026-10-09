import { monthDays } from '@/core/localDate';
import { makeHabit } from '@/testing/fixtures';
import type { DailyReflection, HabitLog, Task } from '../models';
import { escapeHtml, renderReportHtml, type ReportInput, type ReportLabels } from '../printReport';

const labels: ReportLabels = {
  lang: 'he',
  dir: 'rtl',
  title: 'דוח חודשי',
  generated: 'הופק ב',
  perfectDays: 'ימים מושלמים',
  completion: 'השלמה',
  freezes: 'הקפאות',
  pausedDays: 'ימי הפסקה',
  habitsHeading: 'הרגלים',
  totalColumn: 'סה״כ',
  noHabits: 'אין הרגלים',
  legendDone: 'בוצע',
  legendPartial: 'חלקי',
  legendFreeze: 'הקפאה',
  legendSkipped: 'דולג',
  legendPaused: 'הפסקה',
  legendMissed: 'לא סומן',
  freezeMark: 'ק',
  daysHeading: 'יום ביומו',
  tasksHeading: 'משימות',
  taskDone: 'בוצעה',
  taskOpen: 'פתוחה',
  reflectionHeading: 'רפלקציה',
  gratitude: 'הכרת תודה',
  lesson: 'לקח',
  sleep: (hours) => `שעות שינה: ${hours}`,
  mood: (score) => `מצב רוח ${score}/5`,
  habitsDone: (done, total) => `${done} מתוך ${total} בוצעו`,
  weekdays: ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'],
};

const walk = makeHabit({ id: 'walk', title: 'הליכה <b>20</b> דקות', createdAt: '2026-09-01T08:00:00' });
const log = (date: string, status: HabitLog['status']): HabitLog => ({ id: date, habitId: 'walk', logDate: date, currentCount: status === 'completed' ? 1 : 0, status, updatedAt: 'x' });
const reflection: DailyReflection = {
  id: 'r',
  logDate: '2026-09-02',
  moodScore: 4,
  gratitudeText: 'קפה <script>alert(1)</script>',
  lessonText: 'לישון מוקדם',
  createdAt: 'x',
  sleepMinutes: 450,
};
const task: Task = { id: 't', habitId: null, title: 'לשלוח "חשבונית"', isCompleted: true, dueDate: '2026-09-02', createdAt: 'x' };

const base: ReportInput = {
  month: '2026-09-01',
  monthName: 'ספטמבר 2026',
  dates: monthDays('2026-09-01'),
  today: '2026-09-10',
  habits: [walk],
  logs: [log('2026-09-02', 'completed'), log('2026-09-03', 'completed'), log('2026-09-04', 'forgiven'), log('2026-09-05', 'skipped')],
  pauses: [],
  reflections: [reflection],
  tasks: [task],
  includeTasks: true,
  includeReflections: true,
  color: false,
  generatedOn: '10.9.2026',
};

describe('escapeHtml', () => {
  it('neutralizes markup', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });
});

describe('renderReportHtml', () => {
  it('is a right-to-left document with a grid, totals and a legend', () => {
    const html = renderReportHtml(base, labels);
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('דוח חודשי &middot; ספטמבר 2026');
    expect(html).toContain('class="dot full"');
    expect(html).toContain('<i class="frz">ק</i>');
    // 2 done of 8 counted days so far (1st is before the habit existed? created 1 Sep → days 1..10 minus the skipped one)
    expect(html).toMatch(/<td class="tot">2\/9<\/td>/);
    expect(html).toContain('class="legend"');
  });

  it('never lets user text become markup', () => {
    const html = renderReportHtml(base, labels);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>20</b> דקות');
    expect(html).toContain('&lt;b&gt;20&lt;/b&gt;');
  });

  it('adds tasks and reflections only when asked', () => {
    const full = renderReportHtml(base, labels);
    expect(full).toContain('לשלוח &quot;חשבונית&quot;');
    expect(full).toContain('לישון מוקדם');
    expect(full).toContain('שעות שינה: 7.5');

    const habitsOnly = renderReportHtml({ ...base, includeTasks: false, includeReflections: false }, labels);
    expect(habitsOnly).not.toContain('חשבונית');
    expect(habitsOnly).not.toContain('לישון מוקדם');
    expect(habitsOnly).not.toContain('יום ביומו');
  });

  it('says so when there are no habits', () => {
    expect(renderReportHtml({ ...base, habits: [], logs: [] }, labels)).toContain('אין הרגלים');
  });

  it('uses only black, white and grey, unless color is asked for', () => {
    const grey = (hex: string) => {
      const h = hex.slice(1).toLowerCase();
      const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
      return f.slice(0, 2) === f.slice(2, 4) && f.slice(2, 4) === f.slice(4, 6);
    };
    for (const color of renderReportHtml(base, labels).match(/#[0-9a-fA-F]{3,6}\b/g) ?? []) expect(grey(color)).toBe(true);
    const colored = renderReportHtml({ ...base, color: true }, labels);
    expect(colored).toContain('#2d6a9f');
    expect(colored).toContain('#2a7048');
  });
});
