import { Asset } from 'expo-asset';
import { FONT_FAMILY } from '@/components/Text';

const FILES: [number, number][] = [
  [400, require('../../assets/fonts/Rubik_400Regular.ttf')],
  [500, require('../../assets/fonts/Rubik_500Medium.ttf')],
  [600, require('../../assets/fonts/Rubik_600SemiBold.ttf')],
  [700, require('../../assets/fonts/Rubik_700Bold.ttf')],
  [800, require('../../assets/fonts/Rubik_800ExtraBold.ttf')],
];

/** On web, registers every weight under one family so `fontWeight` picks the right file (as on Android). */
export function loadAppFonts(): void {
  if (typeof document === 'undefined' || document.getElementById('app-fonts')) return;
  const style = document.createElement('style');
  style.id = 'app-fonts';
  style.textContent = FILES.map(
    ([weight, file]) => `@font-face{font-family:'${FONT_FAMILY}';font-weight:${weight};font-display:swap;src:url('${Asset.fromModule(file).uri}') format('truetype');}`,
  ).join('\n');
  document.head.appendChild(style);
}
