import { pickInsight } from '../insightPicker';

const cards = [
  { id: 'a', goals: ['focus'], triggers: [] },
  { id: 'b', goals: [], triggers: ['streak_broken'] },
  { id: 'c', goals: ['health'], triggers: [] },
];

describe('pickInsight', () => {
  it('is stable for a day and keeps the card already shown today', () => {
    const first = pickInsight(cards, '2026-09-24', null, [], {});
    expect(pickInsight(cards, '2026-09-24', null, [], {})).toBe(first);
    expect(pickInsight(cards, '2026-09-24', null, [], { c: '2026-09-24' })?.id).toBe('c');
  });

  it('prefers a matching trigger, then the user goal', () => {
    expect(pickInsight(cards, '2026-09-24', 'focus', ['streak_broken'], {})?.id).toBe('b');
    expect(pickInsight(cards, '2026-09-24', 'health', [], {})?.id).toBe('c');
  });

  it('does not repeat until all were seen, then recycles the oldest', () => {
    expect(pickInsight(cards, '2026-09-25', 'health', [], { c: '2026-09-24' })?.id).not.toBe('c');
    const all = { a: '2026-09-20', b: '2026-09-22', c: '2026-09-23' };
    expect(pickInsight(cards, '2026-09-25', null, [], all)?.id).toBe('a');
    expect(pickInsight([], '2026-09-25', null, [], {})).toBeNull();
  });
});
