import { Appearance, StyleSheet, useColorScheme } from 'react-native';
import { usePrefsStore, type LookPref, type ThemePref } from '@/state/prefsStore';

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

/** Garden look, light: warm cream, pine green for done, coral for streaks, sky blue for freezes. */
export const gardenLightColors: Palette = {
  background: '#FFF4E2',
  surface: '#FFFFFF',
  surfaceMuted: '#F8EAD3',
  border: '#EBD6B3',
  text: '#3A281E',
  textMuted: '#6E4F3F',
  primary: '#25703F',
  primaryDeep: '#1B5530',
  primarySoft: '#DDF3DA',
  accent: '#1D5C86',
  success: '#25703F',
  successSoft: '#DDF3DA',
  warning: '#A8431A',
  warningSoft: '#FFE3D3',
  danger: '#B3261E',
  dangerSoft: '#FBE9E7',
  freeze: '#1D5C86',
  freezeSoft: '#D8EEFB',
  onPrimary: '#FFFFFF',
  doneCard: '#E5F5E2',
  partial: '#4E9A74',
};

/** Garden look, dark: a garden at night. */
export const gardenDarkColors: Palette = {
  background: '#18241D',
  surface: '#223128',
  surfaceMuted: '#2B3D31',
  border: '#3A5041',
  text: '#F6EEDD',
  textMuted: '#BCC9B8',
  primary: '#8EDB97',
  primaryDeep: '#B2E9B8',
  primarySoft: '#2D4A36',
  accent: '#9FD3F2',
  success: '#8EDB97',
  successSoft: '#2D4A36',
  warning: '#FFA477',
  warningSoft: '#47291F',
  danger: '#F2998F',
  dangerSoft: '#3A1D1C',
  freeze: '#9FD3F2',
  freezeSoft: '#233B4B',
  onPrimary: '#12301B',
  doneCard: '#28432F',
  partial: '#5FA56C',
};

/** Extra colors of the Garden look's scenery (the hill, the sun, the main button). */
export interface Scenery {
  /** The hill behind the Today header. */
  hill: string;
  sun: string;
  /** Text and icons on `sun`. */
  onSun: string;
  sky: string;
  skyText: string;
  coral: string;
  coralSoft: string;
  cloud: string;
}

const GARDEN_LIGHT_SCENERY: Scenery = {
  hill: '#CDEBC6',
  sun: '#F7B731',
  onSun: '#3A281E',
  sky: '#D8EEFB',
  skyText: '#1D5C86',
  coral: '#A8431A',
  coralSoft: '#FFE3D3',
  cloud: 'rgba(255,255,255,0.7)',
};

const GARDEN_DARK_SCENERY: Scenery = {
  hill: '#22382A',
  sun: '#F7C95B',
  onSun: '#3A281E',
  sky: '#233B4B',
  skyText: '#9FD3F2',
  coral: '#FFA477',
  coralSoft: '#47291F',
  cloud: 'rgba(255,255,255,0.10)',
};

type FocusPalette = {
  backgroundTop: string;
  backgroundBottom: string;
  surface: string;
  surfaceActive: string;
  border: string;
  text: string;
  textMuted: string;
  ringTrack: string;
  ringStart: string;
  ringEnd: string;
  paused: string;
  /** The main button (Start, Resume). */
  button: string;
  onButton: string;
};

const CALM_FOCUS: FocusPalette = {
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
  button: '#E4EEEE',
  onButton: '#0B1517',
};

/** Garden: a night sky, a green ring and a sun-yellow main button. */
const GARDEN_FOCUS: FocusPalette = {
  backgroundTop: '#22344A',
  backgroundBottom: '#121C29',
  surface: 'rgba(255,255,255,0.07)',
  surfaceActive: 'rgba(142,219,151,0.18)',
  border: 'rgba(255,255,255,0.12)',
  text: '#F6EEDD',
  textMuted: '#B9C4CF',
  ringTrack: 'rgba(255,255,255,0.10)',
  ringStart: '#8EDB97',
  ringEnd: '#C3EFC8',
  paused: '#F7C95B',
  button: '#F7C95B',
  onButton: '#3A281E',
};

/**
 * Immersive dark palette for the focus screen (same in light and dark). It follows the
 * look: the values are swapped in place when the look changes, so read them while rendering.
 */
export const focusColors: FocusPalette = { ...CALM_FOCUS };

/** Hero gradient used for the Today header. */
export const heroGradient = ['#2D6A9F', '#1F5685'] as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

type Radii = Record<'sm' | 'md' | 'lg' | 'xl' | 'pill', number>;
const CALM_RADIUS: Radii = { sm: 6, md: 10, lg: 12, xl: 16, pill: 999 };
const GARDEN_RADIUS: Radii = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 };

/**
 * Corner radii of the current look. Like `focusColors`, swapped in place when the look changes;
 * styles made with `makeStyles` are rebuilt per look, so they pick up the new values.
 */
export const radius: Radii = { ...CALM_RADIUS };

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
function makeFlat(c: Palette, look: LookPref) {
  return { borderWidth: look === 'garden' ? 2 : 1.5, borderColor: c.border };
}

export type Look = LookPref;

export interface Theme {
  /** "calm" (the regular look) or "garden" (the sprout that grows with you). */
  look: Look;
  isDark: boolean;
  /** Unique per look and light/dark, for caches. */
  key: string;
  colors: Palette;
  typography: ReturnType<typeof makeTypography>;
  shadow: ReturnType<typeof makeShadow>;
  flat: ReturnType<typeof makeFlat>;
  /** Garden scenery colors (the calm look has the same set, used only by Garden parts). */
  scenery: Scenery;
}

function makeTheme(look: Look, isDark: boolean, colors: Palette, scenery: Scenery): Theme {
  return {
    look,
    isDark,
    key: `${look}-${isDark ? 'dark' : 'light'}`,
    colors,
    typography: makeTypography(colors),
    shadow: makeShadow(isDark),
    flat: makeFlat(colors, look),
    scenery,
  };
}

const THEMES: Record<Look, Record<'light' | 'dark', Theme>> = {
  calm: {
    light: makeTheme('calm', false, lightColors, GARDEN_LIGHT_SCENERY),
    dark: makeTheme('calm', true, darkColors, GARDEN_DARK_SCENERY),
  },
  garden: {
    light: makeTheme('garden', false, gardenLightColors, GARDEN_LIGHT_SCENERY),
    dark: makeTheme('garden', true, gardenDarkColors, GARDEN_DARK_SCENERY),
  },
};

/** Swaps the look's shared tokens (radii, focus colors) in place. */
function applyLookTokens(look: Look): void {
  Object.assign(radius, look === 'garden' ? GARDEN_RADIUS : CALM_RADIUS);
  Object.assign(focusColors, look === 'garden' ? GARDEN_FOCUS : CALM_FOCUS);
}

// Runs before any screen re-renders for the new look (this listener subscribes first).
let appliedLook: Look = 'calm';
usePrefsStore.subscribe((state) => {
  if (state.look === appliedLook) return;
  appliedLook = state.look;
  applyLookTokens(state.look);
});

function resolve(pref: ThemePref, system: string | null | undefined): 'light' | 'dark' {
  if (pref === 'light' || pref === 'dark') return pref;
  return system === 'dark' ? 'dark' : 'light';
}

/** Hook: the active theme (user preference, else the system setting). Live-updates. */
export function useTheme(): Theme {
  const pref = usePrefsStore((s) => s.theme);
  const look = usePrefsStore((s) => s.look);
  const system = useColorScheme();
  return THEMES[look][resolve(pref, system)];
}

/** Non-hook access (services, one-off calls). */
export function currentTheme(): Theme {
  const { theme, look } = usePrefsStore.getState();
  return THEMES[look][resolve(theme, Appearance.getColorScheme())];
}

/**
 * Builds a themed style hook. Styles are created once per theme and cached,
 * so switching themes is instant and renders stay cheap.
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (theme: Theme) => T): () => T {
  const cache = new Map<string, T>();
  return function useStyles(): T {
    const theme = useTheme();
    let styles = cache.get(theme.key);
    if (!styles) {
      styles = StyleSheet.create(factory(theme));
      cache.set(theme.key, styles);
    }
    return styles;
  };
}
