import { Appearance, StyleSheet, useColorScheme } from 'react-native';
import { usePrefsStore, type ThemePref } from '@/state/prefsStore';

type Palette = {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryDeep: string;
  primarySoft: string;
  accent: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  freeze: string;
  freezeSoft: string;
  onPrimary: string;
  doneCard: string;
  partial: string;
};

export const lightColors: Palette = {
  background: '#F5F5FA',
  surface: '#FFFFFF',
  surfaceMuted: '#EEEFF6',
  border: '#E4E5EE',
  text: '#16172B',
  textMuted: '#6B6E85',
  primary: '#5B5BD6',
  primaryDeep: '#4338CA',
  primarySoft: '#E7E7FB',
  accent: '#8B5CF6',
  success: '#16A34A',
  successSoft: '#DCFCE7',
  warning: '#D97706',
  warningSoft: '#FEF3C7',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  freeze: '#0EA5E9',
  freezeSoft: '#E0F2FE',
  onPrimary: '#FFFFFF',
  doneCard: '#F2FBF5',
  partial: '#86D6A0',
};

/** Dark steps chosen separately (not inverted) for comfortable night use. */
export const darkColors: Palette = {
  background: '#0F1020',
  surface: '#1A1B2E',
  surfaceMuted: '#25263D',
  border: '#303252',
  text: '#ECECF6',
  textMuted: '#9EA0BC',
  primary: '#8E8CFF',
  primaryDeep: '#A5A3FF',
  primarySoft: '#2B2B55',
  accent: '#A78BFA',
  success: '#4ADE80',
  successSoft: '#153322',
  warning: '#FBBF24',
  warningSoft: '#3A2D10',
  danger: '#F87171',
  dangerSoft: '#3D1719',
  freeze: '#38BDF8',
  freezeSoft: '#0E2E3E',
  onPrimary: '#0F1020',
  doneCard: '#16291F',
  partial: '#2F7A4B',
};

/** Immersive dark palette for the focus screen (same in both themes). */
export const focusColors = {
  backgroundTop: '#1B1C3A',
  backgroundBottom: '#0B0C1A',
  surface: 'rgba(255,255,255,0.06)',
  surfaceActive: 'rgba(139,139,255,0.18)',
  border: 'rgba(255,255,255,0.10)',
  text: '#EEEEFB',
  textMuted: '#9C9DC6',
  ringTrack: 'rgba(255,255,255,0.08)',
  ringStart: '#8B8BFF',
  ringEnd: '#38BDF8',
  paused: '#FBBF24',
} as const;

/** Hero gradient used for the Today header. */
export const heroGradient = ['#5B5BD6', '#8B5CF6'] as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 14, lg: 20, xl: 28, pill: 999 } as const;

function makeTypography(c: Palette) {
  return {
    display: { fontSize: 34, fontWeight: '800' as const, color: c.text, letterSpacing: -0.5 },
    title: { fontSize: 28, fontWeight: '800' as const, color: c.text, letterSpacing: -0.3 },
    heading: { fontSize: 18, fontWeight: '700' as const, color: c.text },
    body: { fontSize: 16, color: c.text },
    label: { fontSize: 15, fontWeight: '600' as const, color: c.text },
    caption: { fontSize: 13, color: c.textMuted },
    overline: { fontSize: 12, fontWeight: '700' as const, color: c.textMuted, letterSpacing: 1, textTransform: 'uppercase' as const },
  };
}

function makeShadow(isDark: boolean) {
  return {
    shadowColor: isDark ? '#000000' : '#1B1D4D',
    shadowOpacity: isDark ? 0.35 : 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: isDark ? 1 : 2,
  };
}

export interface Theme {
  isDark: boolean;
  colors: Palette;
  typography: ReturnType<typeof makeTypography>;
  shadow: ReturnType<typeof makeShadow>;
}

const THEMES: Record<'light' | 'dark', Theme> = {
  light: { isDark: false, colors: lightColors, typography: makeTypography(lightColors), shadow: makeShadow(false) },
  dark: { isDark: true, colors: darkColors, typography: makeTypography(darkColors), shadow: makeShadow(true) },
};

function resolve(pref: ThemePref, system: string | null | undefined): 'light' | 'dark' {
  if (pref === 'light' || pref === 'dark') return pref;
  return system === 'dark' ? 'dark' : 'light';
}

/** Hook: the active theme (user preference, else the system setting). Live-updates. */
export function useTheme(): Theme {
  const pref = usePrefsStore((s) => s.theme);
  const system = useColorScheme();
  return THEMES[resolve(pref, system)];
}

/** Non-hook access (services, one-off calls). */
export function currentTheme(): Theme {
  return THEMES[resolve(usePrefsStore.getState().theme, Appearance.getColorScheme())];
}

/**
 * Builds a themed style hook. Styles are created once per theme and cached,
 * so switching themes is instant and renders stay cheap.
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (theme: Theme) => T): () => T {
  const cache = new Map<boolean, T>();
  return function useStyles(): T {
    const theme = useTheme();
    let styles = cache.get(theme.isDark);
    if (!styles) {
      styles = StyleSheet.create(factory(theme));
      cache.set(theme.isDark, styles);
    }
    return styles;
  };
}
