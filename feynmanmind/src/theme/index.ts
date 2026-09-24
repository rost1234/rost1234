import { useMemo } from 'react';
import { StyleSheet, useColorScheme, type TextStyle } from 'react-native';
import { usePrefsStore } from '@/state/prefsStore';

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

function makeTypography(colors: Palette) {
  const base: TextStyle = { color: colors.text };
  return {
    title: { ...base, fontSize: 28, fontWeight: '800', letterSpacing: -0.3 },
    heading: { ...base, fontSize: 20, fontWeight: '700' },
    subheading: { ...base, fontSize: 16, fontWeight: '600' },
    body: { ...base, fontSize: 16, lineHeight: 23 },
    caption: { ...base, fontSize: 13, lineHeight: 18, color: colors.textMuted },
    label: { ...base, fontSize: 12, fontWeight: '700', letterSpacing: 0.6, color: colors.textMuted },
  } satisfies Record<string, TextStyle>;
}

export interface Theme {
  colors: Palette;
  isDark: boolean;
  typography: ReturnType<typeof makeTypography>;
}

const lightTheme: Theme = { colors: lightColors, isDark: false, typography: makeTypography(lightColors) };
const darkTheme: Theme = { colors: darkColors, isDark: true, typography: makeTypography(darkColors) };

export function useTheme(): Theme {
  const system = useColorScheme();
  const pref = usePrefsStore((s) => s.theme);
  const dark = pref === 'dark' || (pref === 'auto' && system === 'dark');
  return dark ? darkTheme : lightTheme;
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
