export const colors = {
  background: '#F6F7FB',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF0F6',
  border: '#E1E4EE',
  text: '#141726',
  textMuted: '#646A80',
  primary: '#4F46E5',
  primarySoft: '#E0DEFC',
  success: '#16A34A',
  successSoft: '#DCF5E4',
  warning: '#D97706',
  warningSoft: '#FDEFD6',
  danger: '#DC2626',
  dangerSoft: '#FDE2E2',
  freeze: '#0EA5E9',
  freezeSoft: '#DDF3FD',
  onPrimary: '#FFFFFF',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 18, pill: 999 } as const;

export const typography = {
  title: { fontSize: 28, fontWeight: '700' as const, color: colors.text },
  heading: { fontSize: 20, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 16, color: colors.text },
  label: { fontSize: 14, fontWeight: '600' as const, color: colors.text },
  caption: { fontSize: 13, color: colors.textMuted },
} as const;
