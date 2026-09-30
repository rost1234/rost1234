import { useMemo } from 'react';
import { StyleSheet, useColorScheme, type TextStyle } from 'react-native';
import { usePrefsStore, type TextSizePref } from '@/state/prefsStore';

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
}

export const lightColors: Palette = {
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
};

/** Dark steps chosen for night study, not an inversion of the light palette. */
export const darkColors: Palette = {
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
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 18, pill: 999 } as const;

export const TEXT_SCALE: Record<TextSizePref, number> = { normal: 1, large: 1.15, xlarge: 1.3 };

function makeTypography(colors: Palette, scale = 1) {
  const base: TextStyle = { color: colors.text };
  const s = (n: number) => Math.round(n * scale);
  return {
    title: { ...base, fontSize: s(28), fontWeight: '800', letterSpacing: -0.3 },
    heading: { ...base, fontSize: s(20), fontWeight: '700' },
    subheading: { ...base, fontSize: s(16), fontWeight: '600' },
    body: { ...base, fontSize: s(16), lineHeight: s(23) },
    caption: { ...base, fontSize: s(13), lineHeight: s(18), color: colors.textMuted },
    label: { ...base, fontSize: s(12), fontWeight: '700', letterSpacing: 0.6, color: colors.textMuted },
  } satisfies Record<string, TextStyle>;
}

/** Stronger secondary text and borders for the high-contrast setting. */
const highContrastLight: Partial<Palette> = { textMuted: '#34354A', border: '#8E8FAA', text: '#000000' };
const highContrastDark: Partial<Palette> = { textMuted: '#DADBEE', border: '#7A7AA0', text: '#FFFFFF' };

export interface Theme {
  colors: Palette;
  isDark: boolean;
  /** Multiplier from the text-size setting, for sizes set outside `typography`. */
  textScale: number;
  typography: ReturnType<typeof makeTypography>;
}

// One shared object per combination, so style caches keyed by theme keep working.
const themes = new Map<string, Theme>();
function buildTheme(dark: boolean, highContrast: boolean, textSize: TextSizePref): Theme {
  const key = `${dark}-${highContrast}-${textSize}`;
  let theme = themes.get(key);
  if (!theme) {
    const colors = { ...(dark ? darkColors : lightColors), ...(highContrast ? (dark ? highContrastDark : highContrastLight) : {}) };
    const textScale = TEXT_SCALE[textSize];
    theme = { colors, isDark: dark, textScale, typography: makeTypography(colors, textScale) };
    themes.set(key, theme);
  }
  return theme;
}

export function useTheme(): Theme {
  const system = useColorScheme();
  const pref = usePrefsStore((s) => s.theme);
  const highContrast = usePrefsStore((s) => s.highContrast);
  const textSize = usePrefsStore((s) => s.textSize);
  const dark = pref === 'dark' || (pref === 'auto' && system === 'dark');
  return buildTheme(dark, highContrast, textSize);
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
