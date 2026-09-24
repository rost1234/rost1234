import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { haptics } from '@/core/haptics';
import { makeStyles, radius, spacing, useTheme, type Theme } from './theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

function buttonColors(variant: ButtonVariant, colors: Theme['colors']): { bg: string; fg: string } {
  switch (variant) {
    case 'primary':
      return { bg: colors.primary, fg: colors.onPrimary };
    case 'secondary':
      return { bg: colors.primarySoft, fg: colors.primary };
    case 'ghost':
      return { bg: 'transparent', fg: colors.textMuted };
    case 'danger':
      return { bg: colors.dangerSoft, fg: colors.danger };
  }
}

export function Button({ label, onPress, variant = 'primary', disabled, loading, style, accessibilityHint }: ButtonProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const palette = buttonColors(variant, colors);
  const inactive = disabled === true || loading === true;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading === true }}
      disabled={inactive}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.bg, opacity: inactive ? 0.5 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <Text style={[styles.buttonLabel, { color: palette.fg }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const styles = useStyles();
  return <View style={[styles.card, style]}>{children}</View>;
}

export function ProgressBar({ value, color: colorProp, height = 8 }: { value: number; color?: string; height?: number }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const color = colorProp ?? colors.primary;
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.track, { height, borderRadius: height / 2 }]}
    >
      <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: color, borderRadius: height / 2 }]} />
    </View>
  );
}

export function SectionTitle({ children, action }: { children: string; action?: ReactNode }) {
  const { typography } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.sectionRow}>
      <Text style={typography.overline}>{children}</Text>
      {action}
    </View>
  );
}

export function Banner({ message, tone = 'danger', onDismiss }: { message: string; tone?: 'danger' | 'info'; onDismiss?: () => void }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const isDanger = tone === 'danger';
  return (
    <Pressable
      accessibilityRole="alert"
      onPress={onDismiss}
      style={[styles.banner, { backgroundColor: isDanger ? colors.dangerSoft : colors.freezeSoft }]}
    >
      <Text style={{ color: isDanger ? colors.danger : colors.text, flex: 1 }}>{message}</Text>
      {onDismiss ? <Text style={styles.bannerClose}>✕</Text> : null}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors, typography, shadow }) => ({
  button: {
    minHeight: 50,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: { fontSize: 16, fontWeight: '600' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow,
  },
  track: { width: '100%', backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  fill: { height: '100%' },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  bannerClose: { color: colors.textMuted, fontSize: 16 },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipLabel: { ...typography.label, color: colors.textMuted },
  chipLabelSelected: { color: colors.onPrimary },
}));
