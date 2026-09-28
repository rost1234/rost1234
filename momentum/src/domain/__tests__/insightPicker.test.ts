import { contextTriggers, pickInsight } from '../insightPicker';

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

describe('context triggers', () => {
  const today = '2026-09-24';
  const at = (date: string) => `${date}T10:00:00.000Z`;

  it('turns on low mood for a low reflection yesterday or today only', () => {
    expect(contextTriggers([{ logDate: '2026-09-23', moodScore: 2 }], [], today)).toEqual(['low_mood']);
    expect(contextTriggers([{ logDate: '2026-09-24', moodScore: 1 }], [], today)).toEqual(['low_mood']);
    expect(contextTriggers([{ logDate: '2026-09-22', moodScore: 1 }], [], today)).toEqual([]);
    expect(contextTriggers([{ logDate: '2026-09-23', moodScore: 3 }], [], today)).toEqual([]);
  });

  it('turns on missed focus for a session given up in the last two days', () => {
    expect(contextTriggers([], [{ startTime: at('2026-09-23'), completed: false }], today)).toEqual(['missed_focus']);
    expect(contextTriggers([], [{ startTime: at('2026-09-23'), completed: true }], today)).toEqual([]);
    // Sessions logged before v7 have no completion flag: never count them as given up.
    expect(contextTriggers([], [{ startTime: at('2026-09-23'), completed: null }], today)).toEqual([]);
    expect(contextTriggers([], [{ startTime: at('2026-09-20'), completed: false }], today)).toEqual([]);
  });
});
