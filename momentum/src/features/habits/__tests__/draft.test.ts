import { templateGroups } from '@/domain/presets';
import type { Translator } from '@/i18n';
import { en as EN } from '@/i18n/en';
import { he as HE } from '@/i18n/he';
import { makeHabit } from '@/testing/fixtures';
import { canSave, draftFromHabit, draftFromPreset, emptyDraft, extrasCount, hasHabitTitled, matchIdeas, toNewHabit } from '../draft';
import { amountText, daysText, summaryLine } from '../summary';

// A small stand-in for the app's translator (the real one needs the settings store).
function fake(dict: Record<string, string>, locale: string): Translator {
  const fn = ((key: string, params: Record<string, string | number> = {}) =>
    (dict[key] ?? key).replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ''))) as Translator;
  return Object.assign(fn, { plural: (key: string) => key, language: locale.startsWith('he') ? 'he' : 'en', locale, isRTL: locale.startsWith('he') }) as Translator;
}
const he = fake(HE, 'he-IL');
const en = fake(EN, 'en-US');

describe('habit draft → saved habit', () => {
  it('needs only a name', () => {
    expect(canSave(emptyDraft())).toBe(false);
    expect(canSave({ ...emptyDraft(), title: '  ' })).toBe(false);
    const saved = toNewHabit({ ...emptyDraft(), title: '  Read  ' });
    expect(saved).toMatchObject({ title: 'Read', isQuantitative: false, targetCount: 1, unit: '', targetFrequency: 'daily', targetDays: [], reminder: 'off', isQuit: false });
  });

  it('clears what a quit habit cannot have', () => {
    const saved = toNewHabit({ ...emptyDraft(true), title: 'Scrolling', isQuantitative: true, targetCount: 5, unit: 'min', reminder: 'smart', afterHabitId: 'x', pairing: 'music', growthMode: 'grow', goalCount: 9, quitMinutes: 60, quitCost: 0 });
    expect(saved).toMatchObject({ isQuit: true, isQuantitative: false, targetCount: 1, unit: '', reminder: 'off', afterHabitId: null, pairing: '', growthMode: 'maintain', goalCount: null, quitMinutes: 60, quitCost: null });
  });

  it('falls back to every day when no day is picked, and sorts the days', () => {
    expect(toNewHabit({ ...emptyDraft(), title: 'a', targetFrequency: 'specific_days', targetDays: [] }).targetFrequency).toBe('daily');
    expect(toNewHabit({ ...emptyDraft(), title: 'a', targetFrequency: 'specific_days', targetDays: [4, 0, 2] })).toMatchObject({ targetFrequency: 'specific_days', targetDays: [0, 2, 4] });
  });

  it('keeps an amount within range and drops quit costs from a habit to build', () => {
    const saved = toNewHabit({ ...emptyDraft(), title: 'a', isQuantitative: true, targetCount: 5000, unit: ' pages ', quitCost: 10 });
    expect(saved).toMatchObject({ isQuantitative: true, targetCount: 999, unit: 'pages', quitCost: null });
  });

  it('round-trips an existing habit unchanged', () => {
    const habit = makeHabit({ title: 'Run', isQuantitative: true, targetCount: 20, unit: 'min', targetFrequency: 'specific_days', targetDays: [0, 2, 4], cue: 'after coffee', growthMode: 'grow', goalCount: 40, levelStep: 2 });
    const saved = toNewHabit(draftFromHabit(habit));
    expect(saved).toMatchObject({ title: 'Run', targetCount: 20, unit: 'min', targetDays: [0, 2, 4], cue: 'after coffee', growthMode: 'grow', goalCount: 40, levelStep: 2 });
  });

  it('counts the extras that are set', () => {
    expect(extrasCount(emptyDraft())).toBe(0);
    expect(extrasCount({ ...emptyDraft(), microStep: 'shoes', afterHabitId: 'x', growthMode: 'grow' })).toBe(3);
  });
});

describe('ideas', () => {
  const groups = templateGroups('he');

  it('suggests matching ideas once two letters are typed', () => {
    expect(matchIdeas(groups, 'ק')).toEqual([]);
    const hits = matchIdeas(groups, 'קריא');
    expect(hits.map((p) => p.habit.title)).toContain('קריאה');
    expect(hits.length).toBeLessThanOrEqual(3);
  });

  it('turns an idea into a full draft', () => {
    const water = groups.flatMap((g) => g.presets).find((p) => p.key === 'water');
    expect(water).toBeDefined();
    const draft = draftFromPreset(water!);
    expect(draft).toMatchObject({ title: 'לשתות מים', isQuantitative: true, targetCount: 4, timeOfDay: 'any', isQuit: false });
  });

  it('knows a habit that is already on the list', () => {
    expect(hasHabitTitled([{ title: 'Read ' }], 'read')).toBe(true);
    expect(hasHabitTitled([{ title: 'Run' }], 'Read')).toBe(false);
  });
});

describe('summary line', () => {
  it('says what will be saved', () => {
    expect(summaryLine({ ...emptyDraft(), title: 'a' }, he)).toBe('כל יום · פעם ביום · בכל שעה');
    expect(amountText({ ...emptyDraft(), isQuantitative: true, targetCount: 10, unit: 'pages' }, en)).toBe('10 pages');
    expect(daysText({ ...emptyDraft(), targetFrequency: 'specific_days', targetDays: [0, 1, 2, 3, 4, 5, 6] }, en)).toBe('Every day');
  });
});
