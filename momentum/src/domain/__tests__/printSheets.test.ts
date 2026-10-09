import { makeHabit } from '@/testing/fixtures';
import { renderCalendarSheet, renderDaySheets, renderMonthSheet, renderWeekSheet, SHEET_RENDERERS, type SheetLabels } from '../printSheets';

const labels: SheetLabels = {
  lang: 'he',
  dir: 'rtl',
  weekdayInitials: ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'],
  weekdayNames: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'],
  howTo: 'מסמנים בריבוע',
  howToQuit: 'בהרגל בלי: ביום בלי',
  habits: 'הרגלים',
  tasks: '3 של היום',
  mood: 'מצב רוח',
  moods: ['קשה', 'לא קל', 'בסדר', 'טוב', 'מצוין'],
  sleep: 'שעות שינה',
  gratitude: 'דבר טוב',
  lesson: 'לקח',
  notes: 'הערות',
  quitTag: 'בלי',
  monthSheetTitle: 'לוח חודשי',
  weekSheetTitle: 'שבוע',
  daySheetTitle: 'יום',
  calendarSheetTitle: 'לוח שנה',
  habitLegend: 'ההרגלים',
  countNote: (h) => `${h.targetCount} ${h.unit}`,
  dateLabel: (d) => d,
};

const walk = makeHabit({ id: 'a', title: 'הליכה <i>', microStep: 'נעליים' });
const quit = makeHabit({ id: 'b', title: 'בלי סיגריות', isQuit: true });
const run = makeHabit({ id: 'c', title: 'ריצה', targetFrequency: 'specific_days', targetDays: [1, 3, 5] });
const water = makeHabit({ id: 'd', title: 'מים', isQuantitative: true, targetCount: 6, unit: 'כוסות' });
const input = { habits: [walk, quit, run, water], start: '2026-11-01', monthName: 'נובמבר 2026', labels };

describe('blank sheets', () => {
  it('month: a column per day, a row per habit plus blanks for writing, and a hatched cell on unscheduled days', () => {
    const { html, landscape } = renderMonthSheet(input);
    expect(landscape).toBe(false);
    expect(html).toContain('נובמבר 2026');
    expect((html.match(/<th class="/g) ?? []).length).toBe(31); // 30 days and the name column
    expect((html.match(/<tr style="height:30px">/g) ?? []).length).toBe(12);
    expect(html).toContain('class="off"');
    expect(html).toContain('<span class="tag">בלי</span>');
  });

  it('week: seven columns with tasks, mood and sleep', () => {
    const html = renderWeekSheet(input).html;
    expect(html).toContain('3 של היום');
    expect((html.match(/class="ci" dir="ltr">1</g) ?? []).length).toBe(7);
    expect(html).toContain('שעות שינה');
  });

  it('day: one page per day, only habits scheduled that day', () => {
    const html = renderDaySheets({ ...input, days: 3 }).html;
    expect((html.match(/<section class="page">/g) ?? []).length).toBe(3);
    // 2026-11-01 is a Sunday: running (Mon/Wed/Fri) isn't listed on it.
    const firstPage = html.split('<section class="page">')[1] ?? '';
    expect(firstPage).not.toContain('ריצה');
    expect(firstPage).toContain('6 כוסות');
    expect(html).toContain('dir="ltr">10+<');
  });

  it('calendar: landscape, a numbered box per habit and a legend', () => {
    const { html, landscape } = renderCalendarSheet(input);
    expect(landscape).toBe(true);
    expect(html).toContain('A4 landscape');
    expect(html).toContain('ההרגלים');
    expect(html).toContain('>4</i>');
  });

  it('escapes habit text and uses only black, white and grey', () => {
    for (const render of Object.values(SHEET_RENDERERS)) {
      const html = render(input).html;
      expect(html).not.toContain('<i>');
      expect(html).toContain('הליכה &lt;i&gt;');
      for (const color of html.match(/#[0-9a-fA-F]{3,6}\b/g) ?? []) {
        const hex = color.slice(1).toLowerCase();
        const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
        expect(full.slice(0, 2) === full.slice(2, 4) && full.slice(2, 4) === full.slice(4, 6)).toBe(true);
      }
    }
  });
});
