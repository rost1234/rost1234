import { Assistant_200ExtraLight } from '@expo-google-fonts/assistant/200ExtraLight';
import { Assistant_300Light } from '@expo-google-fonts/assistant/300Light';
import { Assistant_400Regular } from '@expo-google-fonts/assistant/400Regular';
import { Assistant_500Medium } from '@expo-google-fonts/assistant/500Medium';
import { Assistant_600SemiBold } from '@expo-google-fonts/assistant/600SemiBold';
import { Assistant_700Bold } from '@expo-google-fonts/assistant/700Bold';
import { Assistant_800ExtraBold } from '@expo-google-fonts/assistant/800ExtraBold';
import { SecularOne_400Regular } from '@expo-google-fonts/secular-one/400Regular';
import { VarelaRound_400Regular } from '@expo-google-fonts/varela-round/400Regular';
import type { LookPref } from '@/state/prefsStore';

/**
 * Assistant covers Hebrew and Latin. React Native picks a font file per weight, so each weight is its own family.
 * The Garden look uses Varela Round for text and Secular One for bold text (both have Hebrew, one weight each).
 */
export const FONT_FILES = {
  SecularOne_400Regular,
  VarelaRound_400Regular,
  Assistant_200ExtraLight,
  Assistant_300Light,
  Assistant_400Regular,
  Assistant_500Medium,
  Assistant_600SemiBold,
  Assistant_700Bold,
  Assistant_800ExtraBold,
};

type FontFamily = keyof typeof FONT_FILES;

/** The font family for a CSS-style `fontWeight` value (anything unknown is regular). */
export function fontFamilyFor(weight: string | number | undefined, look: LookPref = 'calm'): FontFamily {
  if (look === 'garden') {
    const w = String(weight ?? '400');
    return w === '700' || w === '800' || w === '900' || w === 'bold' ? 'SecularOne_400Regular' : 'VarelaRound_400Regular';
  }
  switch (String(weight ?? '400')) {
    case '100':
    case '200':
      return 'Assistant_200ExtraLight';
    case '300':
      return 'Assistant_300Light';
    case '500':
      return 'Assistant_500Medium';
    case '600':
      return 'Assistant_600SemiBold';
    case '700':
    case 'bold':
      return 'Assistant_700Bold';
    case '800':
    case '900':
      return 'Assistant_800ExtraBold';
    default:
      return 'Assistant_400Regular';
  }
}

let available = true;

/** Set to false if the font files fail to load, so text falls back to the system font with its own weights. */
export const setFontsAvailable = (value: boolean) => {
  available = value;
};
export const fontsAvailable = () => available;
