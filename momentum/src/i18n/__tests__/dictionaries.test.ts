import { en } from '../en';
import { he } from '../he';
import { translate, tPlural } from '../index';

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('dictionaries', () => {
  it('Hebrew has every key, non-empty, with the same placeholders', () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(he[key]?.trim().length).toBeGreaterThan(0);
      expect({ key, p: placeholders(he[key]) }).toEqual({ key, p: placeholders(en[key]) });
    }
    expect(Object.keys(he).sort()).toEqual(Object.keys(en).sort());
  });

  it('every _one key has an _other partner', () => {
    for (const key of Object.keys(en)) {
      if (key.endsWith('_one')) expect(Object.keys(en)).toContain(key.replace(/_one$/, '_other'));
    }
  });

  it('fills placeholders and plural forms', () => {
    expect(translate('en', 'today.doneOf', { done: 2, total: 5 })).toBe('2 of 5 habits done');
    expect(tPlural('en', 'today.freezes', 1)).toBe('1 freeze');
    expect(tPlural('he', 'today.freezes', 3)).toBe('3 הקפאות');
  });
});
