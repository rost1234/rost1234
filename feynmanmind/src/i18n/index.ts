import { getLocales } from 'expo-localization';
import { usePrefsStore, type LanguagePref } from '@/state/prefsStore';
import { en, type TranslationKey } from './en';
import { he } from './he';

export type Language = 'en' | 'he';
export type { TranslationKey };
export type TranslationParams = Record<string, string | number>;

const DICTIONARIES: Record<Language, Record<TranslationKey, string>> = { en, he };

export function deviceLanguage(): Language {
  try {
    const code = getLocales()[0]?.languageCode;
    return code === 'he' || code === 'iw' ? 'he' : 'en';
  } catch {
    return 'en';
  }
}

export function resolveLanguage(pref: LanguagePref): Language {
  return pref === 'auto' ? deviceLanguage() : pref;
}

export function localeFor(language: Language): string {
  return language === 'he' ? 'he-IL' : 'en-US';
}

/** Replaces {name} placeholders. Missing keys fall back to English, then the key. */
export function translate(language: Language, key: TranslationKey, params?: TranslationParams): string {
  const template = DICTIONARIES[language][key] || en[key] || key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

type PluralBase<K extends string> = K extends `${infer B}_one` ? B : never;
export type PluralKey = PluralBase<TranslationKey>;

/** Picks `${key}_one` or `${key}_other` for `count` and passes {count}. */
export function translatePlural(language: Language, key: PluralKey, count: number, params?: TranslationParams): string {
  const suffix = count === 1 ? '_one' : '_other';
  return translate(language, `${key}${suffix}` as TranslationKey, { count, ...params });
}

export interface Translator {
  (key: TranslationKey, params?: TranslationParams): string;
  plural: (key: PluralKey, count: number, params?: TranslationParams) => string;
  language: Language;
  locale: string;
  isRTL: boolean;
}

function makeTranslator(language: Language): Translator {
  const fn = ((key: TranslationKey, params?: TranslationParams) => translate(language, key, params)) as Translator;
  fn.plural = (key, count, params) => translatePlural(language, key, count, params);
  fn.language = language;
  fn.locale = localeFor(language);
  fn.isRTL = language === 'he';
  return fn;
}

const translators: Record<Language, Translator> = { en: makeTranslator('en'), he: makeTranslator('he') };

/** Hook: re-renders when the language preference changes. */
export function useT(): Translator {
  const pref = usePrefsStore((s) => s.language);
  return translators[resolveLanguage(pref)];
}

/** Non-hook access (notifications, services). */
export function currentTranslator(): Translator {
  return translators[resolveLanguage(usePrefsStore.getState().language)];
}
