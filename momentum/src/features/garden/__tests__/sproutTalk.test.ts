import { en } from '@/i18n/en';
import { he } from '@/i18n/he';
import { ambientLine, doneLine, TALK, tapLine, type TalkContext } from '../sproutTalk';

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

const keyOf = (l: { key: string; plural?: number }) => (l.plural === undefined ? l.key : `${l.key}_${l.plural === 1 ? 'one' : 'other'}`);

describe('what the sprout says', () => {
  it('every line exists in English and Hebrew', () => {
    for (const [pool, count] of Object.entries(TALK)) {
      for (let i = 1; i <= count; i += 1) {
        const key = `talk.${pool}.${i}` as keyof typeof en;
        expect(en[key]).toBeTruthy();
        expect(he[key]).toBeTruthy();
      }
    }
  });

  it('greets by the time of day, and cares about the moment first', () => {
    expect(ambientLine(base, 0).key).toMatch(/^talk\.morning\./);
    expect(ambientLine({ ...base, hour: 14 }, 1).key).toMatch(/^talk\.afternoon\./);
    expect(ambientLine({ ...base, hour: 23 }, 1).key).toMatch(/^talk\.night\./);
    expect(ambientLine({ ...base, noHabits: true }, 1).key).toBe('talk.seed.1');
    expect(ambientLine({ ...base, comeback: true }, 1).key).toMatch(/^talk\.comeback\./);
    expect(ambientLine({ ...base, doneCount: 3 }, 1).key).toMatch(/^talk\.allDone\./);
    expect(ambientLine({ ...base, dueCount: 0 }, 1).key).toMatch(/^talk\.quiet\./);
    expect(ambientLine({ ...base, bestStreak: 9 }, 3)).toEqual({ key: 'talk.streak', params: { count: 9 } });
  });

  it('thanks you for a habit: the first drop, any drop, a full day', () => {
    expect(doneLine({ ...base, doneCount: 1 }, 5).key).toMatch(/^talk\.first\./);
    expect(doneLine({ ...base, doneCount: 2 }, 5).key).toMatch(/^talk\.done\./);
    expect(doneLine({ ...base, doneCount: 3 }, 5).key).toMatch(/^talk\.allDone\./);
  });

  it('tapping cycles through reactions, its stage and its days', () => {
    const lines = [0, 1, 2, 3].map((n) => keyOf(tapLine(base, n)));
    expect(lines[1]).toBe('talk.tapNext_other');
    expect(lines[3]).toBe('talk.tapDays_other');
    expect(keyOf(tapLine({ ...base, nextName: null }, 1))).toBe('talk.tapFull');
    for (const key of lines) expect(en[key as keyof typeof en]).toBeTruthy();
  });

  it('never picks a line that does not exist, whatever the seed', () => {
    for (let seed = -5; seed < 40; seed += 1) {
      const l = ambientLine({ ...base, hour: seed % 24 < 0 ? 0 : seed % 24 }, seed);
      expect(en[keyOf(l) as keyof typeof en]).toBeTruthy();
    }
  });
});
