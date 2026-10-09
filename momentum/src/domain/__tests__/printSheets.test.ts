import { makeHabit } from '@/testing/fixtures';
import { printPalette } from '../printPalette';
import { renderCalendarSheet, renderDaySheets, renderMonthByTime, renderMonthCards, renderMonthColumns, renderMonthRows, renderWeekSheet, SHEET_KINDS, SHEET_RENDERERS, type SheetLabels } from '../printSheets';

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
  timeOfDay: { morning: 'בוקר', afternoon: 'צהריים', evening: 'ערב', any: 'בכל שעה' },
  after: (anchor) => `אחרי ${anchor}`,
  countNote: (h) => `${h.targetCount} ${h.unit}`,
  dateLabel: (d) => d,
};

const walk = makeHabit({ id: 'a', title: 'הליכה <i>', microStep: 'נעליים' });
const quit = makeHabit({ id: 'b', title: 'בלי סיגריות', isQuit: true });
const run = makeHabit({ id: 'c', title: 'ריצה', targetFrequency: 'specific_days', targetDays: [1, 3, 5] });
const water = makeHabit({ id: 'd', title: 'מים', isQuantitative: true, targetCount: 6, unit: 'כוסות' });
const input = { habits: [walk, quit, run, water], start: '2026-11-01', monthName: 'נובמבר 2026', labels, color: false };
const inColor = { ...input, color: true };

describe('blank sheets', () => {
  it('month: a column per day, a row per habit plus blanks for writing, and a hatched cell on unscheduled days', () => {
    const { html, landscape } = renderMonthRows(input);
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

  it('columns: a row per day and a column per habit', () => {
    const html = renderMonthColumns(input).html;
    expect((html.match(/<tr style="height:25px">/g) ?? []).length).toBe(30);
    expect(html).toContain('הליכה &lt;i&gt;');
  });

  it('by time of day: groups in morning-to-evening order, stacked habits after their anchor', () => {
    const morning = makeHabit({ id: 'm', title: 'כוס מים', timeOfDay: 'morning' });
    const after = makeHabit({ id: 'n', title: 'ויטמינים', timeOfDay: 'morning', afterHabitId: 'm' });
    const evening = makeHabit({ id: 'e', title: 'קריאה', timeOfDay: 'evening' });
    const html = renderMonthByTime({ ...input, habits: [evening, after, morning] }).html;
    expect(html.indexOf('בוקר')).toBeLessThan(html.indexOf('ערב'));
    expect(html.indexOf('כוס מים')).toBeLessThan(html.indexOf('ויטמינים'));
    expect(html).not.toContain('בכל שעה</td>'); // no habit in that group, no heading
  });

  it('cards: one card per habit, padded to an even number, with the cue and anchor as a note', () => {
    const cue = makeHabit({ id: 'x', title: 'מתיחות', cue: 'ליד החלון' });
    const html = renderMonthCards({ ...input, habits: [walk, cue, water] }).html;
    expect((html.match(/<div class="card"/g) ?? []).length).toBe(4);
    expect(html).toContain('ליד החלון');
    expect(html).toContain('3 כוסות'.replace('3', '6'));
  });

  it('every layout works in black and white and in color', () => {
    for (const kind of SHEET_KINDS) {
      for (const sheetInput of [input, inColor]) {
        const { html } = SHEET_RENDERERS[kind](sheetInput);
        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('הליכה &lt;i&gt;');
      }
    }
  });

  it('black and white uses only black, white and grey; color adds the Calm blue', () => {
    for (const render of Object.values(SHEET_RENDERERS)) {
      const html = render(input).html;
      expect(html).not.toContain('<i>');
      for (const color of html.match(/#[0-9a-fA-F]{3,6}\b/g) ?? []) {
        const hex = color.slice(1).toLowerCase();
        const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
        expect(full.slice(0, 2) === full.slice(2, 4) && full.slice(2, 4) === full.slice(4, 6)).toBe(true);
      }
      expect(render(inColor).html).toContain('#2d6a9f');
    }
  });
});

describe('print palette', () => {
  const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
  };
  const ratio = (a: string, b: string) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
  };

  it('keeps every color legible on white and in its panels', () => {
    const color = printPalette(true);
    for (const accent of color.accents) expect(ratio(accent, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(ratio(color.ink, color.soft)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(color.ink, color.weekend)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(color.muted, color.soft)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(color.headFg, color.headBg)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(color.headFg, color.weekendHead)).toBeGreaterThanOrEqual(4.5);
  });
});
