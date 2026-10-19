import { en } from '@/i18n/en';
import { he } from '@/i18n/he';
import { accessoryFor, hillFlowers, isRainyDay, VISITORS, visitorsEarned, yearsSince, type Accessory } from '@/domain/garden';
import { accessoryShapes, sproutShapes } from '../sproutArt';
import { ambientLine, tapLine, type TalkContext } from '../sproutTalk';

const base: TalkContext = {
  hour: 9,
  dueCount: 3,
  doneCount: 0,
  noHabits: false,
  comeback: false,
  dayOff: false,
  bestStreak: 0,
  stage: 2,
  stageName: 'Two leaves',
  nextName: 'Seedling',
  toNext: 4,
  days: 3,
};

const facts = { days: 0, fullDay: false, bestStreak: 0, comeback: false, perfectWeek: false };
const ACCESSORIES: Accessory[] = ['apple', 'lulav', 'flags', 'matzah', 'wreath', 'party'];

describe('garden visitors', () => {
  it('come only for real things', () => {
    expect(visitorsEarned(facts)).toEqual([]);
    expect(visitorsEarned({ ...facts, fullDay: true })).toEqual(['ladybug']);
    expect(visitorsEarned({ ...facts, days: 60, bestStreak: 7 })).toEqual(['snail', 'bee', 'butterfly']);
    expect(visitorsEarned({ ...facts, days: 100, comeback: true, perfectWeek: true })).toEqual(['bird', 'cricket', 'bee', 'butterfly', 'hedgehog']);
  });

  it('each has a name and a line in both languages', () => {
    for (const v of VISITORS) {
      for (const dict of [en, he] as Record<string, string>[]) {
        expect(dict[`garden.visitor.${v.id}`]).toBeTruthy();
        expect(dict[`talk.visitor.${v.id}`]).toBeTruthy();
      }
    }
  });
});

describe('special days', () => {
  it('wears a holiday sign, nothing on Yom Kippur, and a party hat on the planting anniversary', () => {
    expect(accessoryFor('2026-09-12', 'roshHashana', null)).toBe('apple');
    expect(accessoryFor('2026-09-21', 'yomKippur', null)).toBeNull();
    expect(accessoryFor('2026-10-19', null, null)).toBeNull();
    expect(accessoryFor('2027-10-19', null, '2026-10-19')).toBe('party');
    expect(accessoryFor('2026-10-19', null, '2026-10-19')).toBeNull();
    expect(accessoryFor('2027-09-12', 'roshHashana', '2026-09-12')).toBe('party');
    expect(yearsSince('2026-10-19', '2028-10-19')).toBe(2);
  });

  it('has a line and art for every accessory', () => {
    for (const a of ACCESSORIES) {
      const key = a === 'party' ? 'talk.special.party_other' : `talk.special.${a}`;
      expect((en as Record<string, string>)[key]).toBeTruthy();
      expect((he as Record<string, string>)[key]).toBeTruthy();
      expect(accessoryShapes(a).length).toBeGreaterThan(0);
      expect(sproutShapes(3, 'calm', true, {}, a).length).toBe(sproutShapes(3, 'calm').length + accessoryShapes(a).length);
    }
  });

  it('rains on some winter days only', () => {
    expect(isRainyDay('2026-12-03')).toBe(true);
    expect(isRainyDay('2026-12-04')).toBe(false);
    expect(isRainyDay('2027-02-27')).toBe(true);
    expect(isRainyDay('2026-07-03')).toBe(false);
  });

  it('puts one flower on the hill per habit done, up to seven', () => {
    expect(hillFlowers(0)).toBe(0);
    expect(hillFlowers(3)).toBe(3);
    expect(hillFlowers(12)).toBe(7);
  });
});

describe('what the sprout says on special days', () => {
  it('tells a first visit, then a special day, then that it was just planted', () => {
    expect(ambientLine({ ...base, visitor: 'bee', special: 'apple' }, 1).key).toBe('talk.visitor.bee');
    expect(ambientLine({ ...base, special: 'apple' }, 1).key).toBe('talk.special.apple');
    expect(ambientLine({ ...base, special: 'party', years: 2 }, 1)).toEqual({ key: 'talk.special.party', plural: 2 });
    expect(ambientLine({ ...base, plantedToday: true }, 1).key).toBe('talk.planted');
    expect(ambientLine({ ...base, plantedToday: true, doneCount: 1 }, 0).key).toMatch(/^talk\.morning\./);
    // The bird comes on the day of coming back, and says so.
    expect(ambientLine({ ...base, comeback: true, visitor: 'bird' }, 1).key).toBe('talk.visitor.bird');
    expect(ambientLine({ ...base, comeback: true }, 1).key).toMatch(/^talk\.comeback\./);
  });

  it('says its name when tapped, if it has one', () => {
    expect(tapLine({ ...base, name: 'Pistachio' }, 2)).toEqual({ key: 'talk.tapName', params: { name: 'Pistachio' } });
    expect(tapLine(base, 2).key).toMatch(/^talk\.tap\./);
  });
});
