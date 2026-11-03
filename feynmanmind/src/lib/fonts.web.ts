import { Asset } from 'expo-asset';
import { FONTS } from '@/theme/fonts';

const FILES: [string, number, number][] = [
  [FONTS.rubik, 400, require('../../assets/fonts/Rubik_400Regular.ttf')],
  [FONTS.rubik, 500, require('../../assets/fonts/Rubik_500Medium.ttf')],
  [FONTS.rubik, 600, require('../../assets/fonts/Rubik_600SemiBold.ttf')],
  [FONTS.rubik, 700, require('../../assets/fonts/Rubik_700Bold.ttf')],
  [FONTS.rubik, 800, require('../../assets/fonts/Rubik_800ExtraBold.ttf')],
  [FONTS.serif, 400, require('../../assets/fonts/FrankRuhlLibre_400Regular.ttf')],
  [FONTS.serif, 500, require('../../assets/fonts/FrankRuhlLibre_500Medium.ttf')],
  [FONTS.serif, 600, require('../../assets/fonts/FrankRuhlLibre_600SemiBold.ttf')],
  [FONTS.serif, 700, require('../../assets/fonts/FrankRuhlLibre_700Bold.ttf')],
  [FONTS.serif, 800, require('../../assets/fonts/FrankRuhlLibre_800ExtraBold.ttf')],
  [FONTS.serif, 900, require('../../assets/fonts/FrankRuhlLibre_900Black.ttf')],
  [FONTS.hand, 700, require('../../assets/fonts/AmaticSC_700Bold.ttf')],
];

/** On web, registers every weight under its family so `fontWeight` picks the right file (as on Android). */
export function loadAppFonts(): void {
  if (typeof document === 'undefined' || document.getElementById('app-fonts')) return;
  const style = document.createElement('style');
  style.id = 'app-fonts';
  style.textContent = FILES.map(
    ([family, weight, file]) => `@font-face{font-family:'${family}';font-weight:${weight};font-display:swap;src:url('${Asset.fromModule(file).uri}') format('truetype');}`,
  ).join('\n');
  document.head.appendChild(style);
}
