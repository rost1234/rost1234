import { firstStrong, fixBidi, LRM, paragraphDirection, RLM } from '../bidi';
import { translate } from '@/i18n';

describe('mixed Hebrew and English', () => {
  it('reads a Hebrew sentence right to left even when it starts with an English term', () => {
    expect(paragraphDirection('ROP (Return-Oriented Programming) הוא טכניקה לניצול זיכרון.')).toBe('rtl');
    expect(paragraphDirection('Use the useState hook')).toBe('ltr');
    expect(paragraphDirection('Mostly English words here with one עברית word only')).toBe('ltr');
    expect(paragraphDirection('42 + 7 = 49')).toBeNull();
    expect(firstStrong('(ROP) הוא')).toBe('ltr');
  });

  it('adds a mark only where the first letter points the wrong way, per paragraph', () => {
    expect(fixBidi('ROP הוא טכניקה.')).toBe(`${RLM}ROP הוא טכניקה.`);
    expect(fixBidi('הסבר על ROP.')).toBe('הסבר על ROP.');
    expect(fixBidi('just English')).toBe('just English');
    expect(fixBidi('NX חוסם קוד.\nשורה שנייה עם CSRF.\nOnly English words here (with עברית)')).toBe(`${RLM}NX חוסם קוד.\nשורה שנייה עם CSRF.\nOnly English words here (with עברית)`);
    expect(fixBidi('בעברית\nעברית first, then many English words in this line')).toBe(`בעברית\n${LRM}עברית first, then many English words in this line`);
    // Already marked text is left alone.
    expect(fixBidi(`${RLM}ROP הוא`)).toBe(`${RLM}ROP הוא`);
  });

  it('keeps punctuation after an English value in a Hebrew sentence', () => {
    expect(translate('he', 'cards.deleteBody', { title: 'XSS' })).toContain(`XSS${RLM}`);
    // At the end of the sentence, or a Hebrew value: no mark.
    expect(translate('he', 'cards.deleteBody', { title: 'קריפטוגרפיה' })).not.toContain(RLM);
    expect(translate('en', 'cards.deleteBody', { title: 'XSS' })).not.toContain(RLM);
  });
});
