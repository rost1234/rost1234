import { Platform } from 'react-native';

/**
 * Typeface family names. Android and web use the names registered in app.json
 * (expo-font plugin) and lib/fonts.web.ts; iOS uses each file's own family name.
 */
export const FONTS = {
  /** Clean sans (Hebrew + Latin): the chalkboard's body text. */
  rubik: 'Rubik',
  /** Book serif: the lab notebook's text and headings. */
  serif: Platform.select({ ios: 'Frank Ruhl Libre', default: 'FrankRuhl' }),
  /** Handwriting / chalk: notes, and the chalkboard's headings. Latin letters are small caps. */
  hand: Platform.select({ ios: 'Amatic SC', default: 'Amatic' }),
} as const;
