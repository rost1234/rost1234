/**
 * Mixed Hebrew and English in one text. Phones pick a paragraph's direction from
 * its first strong letter, so "ROP הוא טכניקה…" would be laid out left to right
 * and its punctuation would jump. These helpers decide the direction from the
 * paragraph's words and add an invisible direction mark when the first letter
 * would mislead (RLM / LRM work on Android, iOS and the web alike).
 */

const HEBREW = /[֐-׿יִ-ﭏ]/;
const LATIN = /[A-Za-zÀ-ɏ]/;
const STRONG = /[֐-׿יִ-ﭏA-Za-zÀ-ɏ]/g;

export const RLM = '‏';
export const LRM = '‎';

export type Direction = 'rtl' | 'ltr';

/**
 * The direction a paragraph reads in: right to left when it has Hebrew words and
 * English doesn't clearly dominate (a Hebrew sentence with a few English terms),
 * left to right for English, null when it has no letters (numbers, emoji).
 */
export function paragraphDirection(line: string): Direction | null {
  let hebrew = 0;
  let latin = 0;
  for (const word of line.split(/\s+/)) {
    if (HEBREW.test(word)) hebrew++;
    else if (LATIN.test(word)) latin++;
  }
  if (!hebrew && !latin) return null;
  return hebrew > 0 && latin <= hebrew * 3 ? 'rtl' : 'ltr';
}

/** The direction of the first strong letter, which is what the phone goes by. */
export function firstStrong(text: string): Direction | null {
  const m = text.match(STRONG);
  if (!m) return null;
  return HEBREW.test(m[0]!) ? 'rtl' : 'ltr';
}

/** The direction of the last strong letter. */
export function lastStrong(text: string): Direction | null {
  const m = text.match(STRONG);
  if (!m) return null;
  return HEBREW.test(m[m.length - 1]!) ? 'rtl' : 'ltr';
}

/**
 * Text ready to display: each paragraph whose first letter points the wrong way
 * gets a direction mark in front. Returns the same string when nothing changes.
 */
export function fixBidi(text: string): string {
  if (!HEBREW.test(text) || !LATIN.test(text)) return text;
  let changed = false;
  const lines = text.split('\n').map((line) => {
    const dir = paragraphDirection(line);
    if (!dir || line.startsWith(RLM) || line.startsWith(LRM) || firstStrong(line) === dir) return line;
    changed = true;
    return (dir === 'rtl' ? RLM : LRM) + line;
  });
  return changed ? lines.join('\n') : text;
}
