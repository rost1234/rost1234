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
  background: '#F2F7F6',
  surface: '#FFFFFF',
  surfaceMuted: '#E6EFEE',
  border: '#D5E3E1',
  text: '#12312F',
  textMuted: '#4F6868',
  primary: '#2D6A9F',
  primaryDeep: '#1F5685',
  primarySoft: '#E1EEF7',
  accent: '#6554C0',
  success: '#2A7048',
  successSoft: '#E6F3EB',
  warning: '#8F5200',
  warningSoft: '#FBEFD5',
  danger: '#B3261E',
  dangerSoft: '#FBE9E7',
  freeze: '#0B6A89',
  freezeSoft: '#E0F1F6',
  onPrimary: '#FFFFFF',
  doneCard: '#EAF5EE',
  partial: '#4E9A74',
};

/** Dark steps chosen separately (not inverted) for comfortable night use. */
export const darkColors: Palette = {
  background: '#101A1C',
  surface: '#172427',
  surfaceMuted: '#1F3033',
  border: '#2C4144',
  text: '#E4EEEE',
  textMuted: '#9DB2B3',
  primary: '#7FB8E6',
  primaryDeep: '#A3CDEF',
  primarySoft: '#1D3447',
  accent: '#B3A5F0',
  success: '#6FCF97',
  successSoft: '#17302A',
  warning: '#E7B25C',
  warningSoft: '#33290F',
  danger: '#F2998F',
  dangerSoft: '#3A1D1C',
  freeze: '#5CC4DD',
  freezeSoft: '#12303A',
  onPrimary: '#0D1A22',
  doneCard: '#15292A',
  partial: '#3C8A63',
};

/** Immersive dark palette for the focus screen (same in both themes). */
export const focusColors = {
  backgroundTop: '#17303A',
  backgroundBottom: '#0B1517',
  surface: 'rgba(255,255,255,0.06)',
  surfaceActive: 'rgba(127,184,230,0.18)',
  border: 'rgba(255,255,255,0.10)',
  text: '#E4EEEE',
  textMuted: '#9DB2B3',
  ringTrack: 'rgba(255,255,255,0.08)',
  ringStart: '#7FB8E6',
  ringEnd: '#5CC4DD',
  paused: '#FBBF24',
} as const;

/** Hero gradient used for the Today header. */
export const heroGradient = ['#2D6A9F', '#1F5685'] as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 6, md: 10, lg: 12, xl: 16, pill: 999 } as const;

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

/** Cards are flat with a thin outline (floating things like the toast and sheets keep `shadow`). */
function makeFlat(c: Palette) {
  return { borderWidth: 1.5, borderColor: c.border };
}

export interface Theme {
  isDark: boolean;
  colors: Palette;
  typography: ReturnType<typeof makeTypography>;
  shadow: ReturnType<typeof makeShadow>;
  flat: ReturnType<typeof makeFlat>;
}

const THEMES: Record<'light' | 'dark', Theme> = {
  light: { isDark: false, colors: lightColors, typography: makeTypography(lightColors), shadow: makeShadow(false), flat: makeFlat(lightColors) },
  dark: { isDark: true, colors: darkColors, typography: makeTypography(darkColors), shadow: makeShadow(true), flat: makeFlat(darkColors) },
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
