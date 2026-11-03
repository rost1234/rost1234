import { useMemo } from 'react';
import { StyleSheet, useColorScheme, type TextStyle, type ViewStyle } from 'react-native';
import { usePrefsStore, type LookPref, type TextSizePref } from '@/state/prefsStore';
import { FONTS } from './fonts';

export { FONTS };

export interface Palette {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primarySoft: string;
  onPrimary: string;
  accent: string;
  accentSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  /** The main button: dark ink on paper, yellow chalk on the board. */
  button: string;
  onButton: string;
  /** Pen ink: handwritten notes, checkmarks. */
  ink: string;
  /** Marker highlight behind (paper) or under (chalk) key words. */
  highlight: string;
  /** Header and tab bar. */
  chrome: string;
}

/** Light mode: a lab notebook — cream paper, dark ink, blue fountain pen, red corrections. */
export const lightColors: Palette = {
  background: '#F4EBD6',
  surface: '#FFFDF6',
  surfaceMuted: '#EADDBE',
  border: '#D7C49E',
  text: '#2A2219',
  textMuted: '#6B5A45',
  primary: '#1F4E8C',
  primarySoft: '#E4EAF1',
  onPrimary: '#FFFDF6',
  accent: '#B7791F',
  accentSoft: '#F6E7C1',
  success: '#3E6B48',
  successSoft: '#E2EBD8',
  warning: '#9A6212',
  warningSoft: '#F6E7C1',
  danger: '#A3301F',
  dangerSoft: '#F5DCD4',
  button: '#2A2219',
  onButton: '#FFFDF6',
  ink: '#1F4E8C',
  highlight: 'rgba(255,205,60,0.55)',
  chrome: '#EADDBE',
};

/** Dark mode: a chalkboard — slate green, white and yellow chalk, blue headings, pink for mistakes. */
export const darkColors: Palette = {
  background: '#22392F',
  surface: '#28423A',
  surfaceMuted: '#31503F',
  border: 'rgba(238,240,232,0.42)',
  text: '#EEF0E8',
  textMuted: '#A9BBAE',
  primary: '#FFE27A',
  primarySoft: '#3B5238',
  onPrimary: '#22392F',
  accent: '#FFE27A',
  accentSoft: '#3B5238',
  success: '#B8E6A8',
  successSoft: '#2E4B37',
  warning: '#FFD08A',
  warningSoft: '#4A4630',
  danger: '#FFAFB0',
  dangerSoft: '#4A3535',
  button: '#FFE27A',
  onButton: '#22392F',
  ink: '#A6DBFF',
  highlight: '#FFE27A',
  chrome: '#1D3128',
};

/** The classic look (before the notebook): clean indigo on white, and a deep navy night mode. */
export const classicLightColors: Palette = {
  background: '#F6F6FB',
  surface: '#FFFFFF',
  surfaceMuted: '#EEEEF6',
  border: '#E2E2EE',
  text: '#15152B',
  textMuted: '#62637D',
  primary: '#4F46E5',
  primarySoft: '#E8E7FD',
  onPrimary: '#FFFFFF',
  accent: '#D97706',
  accentSoft: '#FEF3C7',
  success: '#15803D',
  successSoft: '#DCFCE7',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  button: '#4F46E5',
  onButton: '#FFFFFF',
  ink: '#4F46E5',
  highlight: '#E8E7FD',
  chrome: '#FFFFFF',
};

export const classicDarkColors: Palette = {
  background: '#0F0F1E',
  surface: '#1A1A2F',
  surfaceMuted: '#24243D',
  border: '#303050',
  text: '#ECECF8',
  textMuted: '#A0A1BD',
  primary: '#8B87FF',
  primarySoft: '#2A2A55',
  onPrimary: '#0F0F1E',
  accent: '#FBBF24',
  accentSoft: '#3A2D10',
  success: '#4ADE80',
  successSoft: '#143322',
  warning: '#FBBF24',
  warningSoft: '#3A2D10',
  danger: '#F87171',
  dangerSoft: '#3D1719',
  button: '#8B87FF',
  onButton: '#0F0F1E',
  ink: '#8B87FF',
  highlight: '#2A2A55',
  chrome: '#1A1A2F',
};

/** Colors of the course map's levels and nodes, per mode. */
export interface MapColors {
  levels: { main: string; lip: string }[];
  gold: { main: string; lip: string; ink: string };
  /** Text and icons on a filled node or level banner. */
  onFill: string;
}
const lightMap: MapColors = {
  levels: [
    { main: '#1F4E8C', lip: '#163A69' },
    { main: '#3E6B48', lip: '#2C4D33' },
    { main: '#8B5A2B', lip: '#66411F' },
    { main: '#A3301F', lip: '#7A2216' },
  ],
  gold: { main: '#D9B23A', lip: '#A8861F', ink: '#3A2C05' },
  onFill: '#FFFDF6',
};
/** The classic map: bright raised buttons, one color per level. */
const classicMap: MapColors = {
  levels: [
    { main: '#2FA84F', lip: '#23843C' },
    { main: '#1A8FE3', lip: '#146FB3' },
    { main: '#9B59E0', lip: '#7A41B8' },
    { main: '#F07B12', lip: '#C0600A' },
  ],
  gold: { main: '#FFC800', lip: '#E0A800', ink: '#6B4A00' },
  onFill: '#FFFFFF',
};
const darkMap: MapColors = {
  levels: [
    { main: '#A6DBFF', lip: '#78AFD6' },
    { main: '#B8E6A8', lip: '#8DBD7E' },
    { main: '#FFD08A', lip: '#D6A762' },
    { main: '#FFAFB0', lip: '#D68788' },
  ],
  gold: { main: '#FFE27A', lip: '#D6B850', ink: '#3A3205' },
  onFill: '#22392F',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 18, pill: 999 } as const;

export const TEXT_SCALE: Record<TextSizePref, number> = { normal: 1, large: 1.15, xlarge: 1.3 };

/** The fonts of each mode: body text, headings, handwriting. */
export interface ThemeFonts {
  body: string;
  heading: string;
  hand: string;
}
const labFonts: ThemeFonts = { body: FONTS.serif, heading: FONTS.serif, hand: FONTS.hand };
const chalkFonts: ThemeFonts = { body: FONTS.rubik, heading: FONTS.hand, hand: FONTS.hand };
const classicFonts: ThemeFonts = { body: FONTS.rubik, heading: FONTS.rubik, hand: FONTS.rubik };

/** Which of the three styles is being drawn: notebook paper, chalkboard, or the classic look. */
export type Look = 'paper' | 'chalk' | 'classic';

function makeTypography(colors: Palette, fonts: ThemeFonts, look: Look, scale = 1) {
  const base: TextStyle = { color: colors.text, fontFamily: fonts.body };
  const s = (n: number) => Math.round(n * scale);
  if (look === 'classic') {
    return {
      title: { ...base, fontSize: s(28), fontWeight: '800', letterSpacing: -0.3 },
      heading: { ...base, fontSize: s(20), fontWeight: '700' },
      subheading: { ...base, fontSize: s(16), fontWeight: '600' },
      body: { ...base, fontSize: s(16), lineHeight: s(23) },
      caption: { ...base, fontSize: s(13), lineHeight: s(18), color: colors.textMuted },
      label: { ...base, fontSize: s(12), fontWeight: '700', letterSpacing: 0.6, color: colors.textMuted },
      hand: { ...base, fontSize: s(16), fontWeight: '700', color: colors.primary },
    } satisfies Record<string, TextStyle>;
  }
  if (look === 'chalk') {
    // Chalkboard: headings in chalk handwriting (tall and narrow, so larger), body in a clean sans.
    const chalk: TextStyle = { ...base, fontFamily: fonts.heading, fontWeight: '700' };
    return {
      title: { ...chalk, fontSize: s(44), lineHeight: s(48) },
      heading: { ...chalk, fontSize: s(32), lineHeight: s(36) },
      subheading: { ...base, fontSize: s(16), fontWeight: '600' },
      body: { ...base, fontSize: s(16), lineHeight: s(23) },
      caption: { ...base, fontSize: s(13), lineHeight: s(18), color: colors.textMuted },
      label: { ...chalk, fontSize: s(24), lineHeight: s(28), color: colors.ink },
      hand: { ...chalk, fontSize: s(26), lineHeight: s(30), color: colors.primary },
    } satisfies Record<string, TextStyle>;
  }
  // Lab notebook: a book serif throughout; section labels in red italics like a ruled heading.
  return {
    title: { ...base, fontFamily: fonts.heading, fontSize: s(30), lineHeight: s(36), fontWeight: '900' },
    heading: { ...base, fontFamily: fonts.heading, fontSize: s(21), lineHeight: s(27), fontWeight: '800' },
    subheading: { ...base, fontSize: s(17), lineHeight: s(23), fontWeight: '700' },
    body: { ...base, fontSize: s(17), lineHeight: s(25) },
    caption: { ...base, fontSize: s(14), lineHeight: s(19), color: colors.textMuted },
    label: { ...base, fontSize: s(16), lineHeight: s(21), fontWeight: '700', fontStyle: 'italic', color: colors.danger },
    hand: { ...base, fontFamily: fonts.hand, fontSize: s(24), lineHeight: s(28), fontWeight: '700', color: colors.ink },
  } satisfies Record<string, TextStyle>;
}

/** Stronger secondary text and borders for the high-contrast setting. */
const highContrastLight: Partial<Palette> = { textMuted: '#3A2E20', border: '#8C7652', text: '#000000' };
const highContrastDark: Partial<Palette> = { textMuted: '#DDE6DF', border: 'rgba(255,255,255,0.8)', text: '#FFFFFF' };
const classicHighContrastLight: Partial<Palette> = { textMuted: '#34354A', border: '#8E8FAA', text: '#000000' };
const classicHighContrastDark: Partial<Palette> = { textMuted: '#DADBEE', border: '#7A7AA0', text: '#FFFFFF' };

export interface Theme {
  colors: Palette;
  isDark: boolean;
  /** Multiplier from the text-size setting, for sizes set outside `typography`. */
  textScale: number;
  typography: ReturnType<typeof makeTypography>;
  fonts: ThemeFonts;
  map: MapColors;
  /** The style being drawn (backgrounds, cards, buttons, maps differ per look). */
  look: Look;
  /** A plain card surface in the current look, for screens that style their own boxes. */
  sheet: ViewStyle;
}

function sheetFor(look: Look, colors: Palette): ViewStyle {
  if (look === 'paper') return { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 3, boxShadow: '0px 1px 0px #CDB68A, 0px 6px 14px rgba(90,60,20,0.10)' };
  if (look === 'chalk') return { backgroundColor: 'rgba(255,255,255,0.035)', borderWidth: 1.5, borderColor: 'rgba(238,240,232,0.5)', borderRadius: 14 };
  return { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg };
}

// One shared object per combination, so style caches keyed by theme keep working.
const themes = new Map<string, Theme>();
function buildTheme(dark: boolean, highContrast: boolean, textSize: TextSizePref, lookPref: LookPref): Theme {
  const key = `${dark}-${highContrast}-${textSize}-${lookPref}`;
  let theme = themes.get(key);
  if (!theme) {
    const look: Look = lookPref === 'classic' ? 'classic' : dark ? 'chalk' : 'paper';
    const base = look === 'classic' ? (dark ? classicDarkColors : classicLightColors) : dark ? darkColors : lightColors;
    const contrast = look === 'classic' ? (dark ? classicHighContrastDark : classicHighContrastLight) : dark ? highContrastDark : highContrastLight;
    const colors = { ...base, ...(highContrast ? contrast : {}) };
    const textScale = TEXT_SCALE[textSize];
    const fonts = look === 'classic' ? classicFonts : look === 'chalk' ? chalkFonts : labFonts;
    theme = {
      colors,
      isDark: dark,
      textScale,
      typography: makeTypography(colors, fonts, look, textScale),
      fonts,
      map: look === 'classic' ? classicMap : dark ? darkMap : lightMap,
      look,
      sheet: sheetFor(look, colors),
    };
    themes.set(key, theme);
  }
  return theme;
}

export function useTheme(): Theme {
  const system = useColorScheme();
  const pref = usePrefsStore((s) => s.theme);
  const look = usePrefsStore((s) => s.look);
  const highContrast = usePrefsStore((s) => s.highContrast);
  const textSize = usePrefsStore((s) => s.textSize);
  const dark = pref === 'dark' || (pref === 'auto' && system === 'dark');
  return buildTheme(dark, highContrast, textSize, look ?? 'notebook');
}

/** Theme-aware StyleSheet factory: `const useStyles = makeStyles(({ colors }) => ({ ... }))`. */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (theme: Theme) => T): () => T {
  const cache = new WeakMap<Theme, T>();
  return function useStyles() {
    const theme = useTheme();
    return useMemo(() => {
      let styles = cache.get(theme);
      if (!styles) {
        styles = StyleSheet.create(factory(theme));
        cache.set(theme, styles);
      }
      return styles;
    }, [theme]);
  };
}

/** Maps a 0–100 mastery/comprehension score to a semantic color. */
export function scoreColor(score: number, colors: Palette): string {
  if (score >= 71) return colors.success;
  if (score >= 41) return colors.warning;
  return colors.danger;
}
