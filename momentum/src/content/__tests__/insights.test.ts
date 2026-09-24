import insights from '../insights.json';
import { validateInsights } from '../insightSchema';

describe('insights.json', () => {
  it('passes the content schema and sourcing rules', () => {
    expect(validateInsights(insights)).toEqual([]);
  });
});

describe('validateInsights', () => {
  it('rejects a book-only card claiming strong evidence and a card without a source', () => {
    const base = (insights as unknown[])[0] as Record<string, unknown>;
    const bookOnly = { ...base, id: 'x', evidence: 'strong', source: { ...(base.source as object), type: 'book' } };
    const noSource = { ...base, id: 'y', source: undefined };
    const errors = validateInsights([bookOnly, noSource]);
    expect(errors.some((e) => e.includes('book-only'))).toBe(true);
    expect(errors.some((e) => e.includes('source is required'))).toBe(true);
  });
});
