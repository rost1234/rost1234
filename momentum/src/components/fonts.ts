import { Assistant_200ExtraLight } from '@expo-google-fonts/assistant/200ExtraLight';
import { Assistant_300Light } from '@expo-google-fonts/assistant/300Light';
import { Assistant_400Regular } from '@expo-google-fonts/assistant/400Regular';
import { Assistant_500Medium } from '@expo-google-fonts/assistant/500Medium';
import { Assistant_600SemiBold } from '@expo-google-fonts/assistant/600SemiBold';
import { Assistant_700Bold } from '@expo-google-fonts/assistant/700Bold';
import { Assistant_800ExtraBold } from '@expo-google-fonts/assistant/800ExtraBold';

/** Assistant covers Hebrew and Latin. React Native picks a font file per weight, so each weight is its own family. */
export const FONT_FILES = {
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
export function fontFamilyFor(weight: string | number | undefined): FontFamily {
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
