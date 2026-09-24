export const colors = {
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
} as const;

/** Immersive dark palette for the focus screen. */
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

/** Soft, low-contrast elevation for cards. */
export const shadow = {
  shadowColor: '#1B1D4D',
  shadowOpacity: 0.07,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

export const typography = {
  display: { fontSize: 34, fontWeight: '800' as const, color: colors.text, letterSpacing: -0.5 },
  title: { fontSize: 28, fontWeight: '800' as const, color: colors.text, letterSpacing: -0.3 },
  heading: { fontSize: 18, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 16, color: colors.text },
  label: { fontSize: 15, fontWeight: '600' as const, color: colors.text },
  caption: { fontSize: 13, color: colors.textMuted },
  overline: { fontSize: 12, fontWeight: '700' as const, color: colors.textMuted, letterSpacing: 1, textTransform: 'uppercase' as const },
} as const;
