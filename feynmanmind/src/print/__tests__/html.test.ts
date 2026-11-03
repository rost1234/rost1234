import { physics } from '@/content/courses/physics';
import { buildKitHtml, pageCount, type PaperMode } from '../html';
import { planMonth, type PlanStation } from '../plan';

const stations: PlanStation[] = physics.levels[0]!.stations.map((s) => ({
  courseId: 'physics',
  courseTitle: 'פיזיקה',
  key: s.key,
  title: s.title,
  unit: s.unit,
  parts: s.parts ?? null,
  text: '',
  summary: s.summary,
  cards: s.cards ?? [],
}));
// One station without a lesson yet (an upper level the AI hasn't written).
stations.push({ courseId: 'physics', courseTitle: 'פיזיקה', key: 'x', title: 'תנועה <מעגלית>', parts: null, text: '', summary: 'סיכום', cards: [] });
const plan = planMonth(stations, { year: 2026, month: 10, studyDays: [0, 1, 2, 3, 4], perDay: 1 });
const cards = plan.stations.reduce((n, s) => n + s.cards.length, 0);
const pages = (html: string) => (html.match(/<div class="page">/g) ?? []).length;

describe('the printable kit', () => {
  it.each<PaperMode>(['full', 'saver', 'max', 'track'])('%s mode draws exactly the pages it promises', (mode) => {
    const html = buildKitHtml(plan, { mode, color: true, monthLabel: 'נובמבר 2026', title: 'פיזיקה' });
    expect(pages(html)).toBe(pageCount(mode, plan.stations.length, cards));
  });

  it('saves paper step by step', () => {
    const n = plan.stations.length;
    expect([pageCount('full', n, cards), pageCount('saver', n, cards), pageCount('max', n, cards), pageCount('track', n, cards)]).toEqual([17, 10, 5, 1]);
  });

  it('prints in black and white on request, escapes text, and shows lessons that are not written yet', () => {
    const color = buildKitHtml(plan, { mode: 'full', color: true, monthLabel: 'נובמבר 2026', title: 'פיזיקה' });
    const bw = buildKitHtml(plan, { mode: 'full', color: false, monthLabel: 'נובמבר 2026', title: 'פיזיקה' });
    expect(color).toContain('<body class="">');
    expect(bw).toContain('<body class="bw">');
    expect(bw).toContain('תנועה &lt;מעגלית&gt;');
    expect(bw).toContain('השיעור המלא ייכתב באפליקציה');
    expect(color).toContain('החוק השני של ניוטון');
    expect(color).toContain('size: A4 landscape');
  });

  it('shows reviews already scheduled in the app', () => {
    const html = buildKitHtml(plan, { mode: 'track', color: true, monthLabel: 'נובמבר', title: 'פיזיקה', carryover: { '2026-11-03': ['תא', 'DNA', 'מיטוזה'] } });
    expect(html).toContain('↺ תא, DNA +1');
  });
});

describe('a busy month', () => {
  it('fits a long tracker next to the calendar (dense rows) in the saving modes', () => {
    const many = Array.from({ length: 22 }, (_, i) => ({ ...stations[i % 12]!, key: `k${i}` }));
    const busy = planMonth(many, { year: 2026, month: 9, studyDays: [0, 1, 2, 3, 4], perDay: 1 });
    const html = buildKitHtml(busy, { mode: 'track', color: true, monthLabel: 'אוקטובר', title: 'פיזיקה' });
    expect(html).toContain('table class="mini dense"');
    expect(html).not.toContain('בחודש הבא');
  });
});
