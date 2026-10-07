/** The reply language every AI function writes in, chosen by the app (not by what the learner typed). */

import { HttpError } from './http.ts';

export const LANGUAGES: Record<string, string> = { he: 'Hebrew', en: 'English' };

/** Reads `language` ("he" | "en", default "he") and returns its English name for the prompt. */
export function parseLanguage(value: unknown): string {
  const language = LANGUAGES[typeof value === 'string' ? value : 'he'];
  if (!language) throw new HttpError(400, 'language must be "he" or "en"', 'invalid_input');
  return language;
}

/** Appended to every system prompt: one language, always, whatever the input language. */
export const LANGUAGE_RULES = `
## Language
- Write every text field in LANGUAGE, always. Do this even when the learner,
  the lesson or the source material is written in another language or mixes
  languages; never switch languages between replies.
- A technical term that is usually said in English may follow the LANGUAGE
  term in parentheses, e.g. "חומצה דאוקסיריבונוקלאית (DNA)", and established
  English names (DNA, CPU, Python) may be used as they are.
`.trim();
