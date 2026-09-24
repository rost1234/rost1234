import { en } from '../en';
import { he } from '../he';
import { translate, translatePlural } from '../index';

const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();

describe('translations', () => {
  it('Hebrew has every English key and nothing extra', () => {
    expect(Object.keys(he).sort()).toEqual(Object.keys(en).sort());
  });

  it.each(Object.keys(en) as (keyof typeof en)[])('%s keeps the same placeholders in Hebrew', (key) => {
    // Hebrew "_one" forms may spell the number out ("יום אחד") instead of {count}.
    const expected = placeholders(en[key]).filter((p) => !(key.endsWith('_one') && p === '{count}'));
    const actual = placeholders(he[key]).filter((p) => !(key.endsWith('_one') && p === '{count}'));
    expect(actual).toEqual(expected);
  });

  it('no translation is empty', () => {
    for (const [key, value] of Object.entries(he)) expect([key, value.trim().length > 0]).toEqual([key, true]);
  });

  it('interpolates params and picks plural forms', () => {
    expect(translate('en', 'auth.codeSent', { email: 'a@b.co' })).toBe('We sent a code to a@b.co.');
    expect(translatePlural('en', 'today.due', 1)).toBe('1 card due');
    expect(translatePlural('en', 'today.due', 3)).toBe('3 cards due');
    expect(translatePlural('he', 'interval.days', 6)).toBe('6 ימים');
  });
});
