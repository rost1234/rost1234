import { INSIGHTS, insightLines, teaserOf } from '@/content/insights';
import { byDay, toldEntries } from '../notebookEntries';

const [a, b, c] = INSIGHTS;

describe('notebook entries', () => {
  it('lists told cards newest first, with why only when it was that same day', () => {
    if (!a || !b || !c) throw new Error('needs cards');
    const shown = { [a.id]: '2026-10-12', [b.id]: '2026-10-14' };
    const notes = { [a.id]: { date: '2026-10-10', reason: 'daily' as const }, [b.id]: { date: '2026-10-14', reason: 'notToday' as const } };
    const entries = toldEntries(INSIGHTS, shown, notes);
    expect(entries.map((e) => [e.insight.id, e.date, e.reason])).toEqual([
      [b.id, '2026-10-14', 'notToday'],
      [a.id, '2026-10-12', null],
    ]);
    expect(byDay(entries).map((d) => [d.date, d.entries.length])).toEqual([
      ['2026-10-14', 1],
      ['2026-10-12', 1],
    ]);
  });

  it("tells a card in the sprout's words or plainly, and teases one not told yet", () => {
    if (!a) throw new Error('needs cards');
    expect(insightLines(a, true, true)).toEqual(a.he.sprout);
    expect(insightLines(a, false, false)).toEqual({ finding: a.finding, action: a.action });
    expect(teaserOf('I read a study from London: something.')).toBe('I read a study from London…');
    expect(teaserOf('one two three four five six seven eight nine')).toBe('one two three four five six seven…');
  });
});
