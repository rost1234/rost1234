import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { makeStyles, radius, spacing, useTheme, type Palette } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  /** Safe-area edges to pad (top for screens without a header). Bottom is always handled. */
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
  refreshControl?: ComponentProps<typeof ScrollView>['refreshControl'];
}

/** Extra space below the last item so it can be scrolled well clear of the screen edge. */
export const SCROLL_BOTTOM_BUFFER = 96;

export function Screen({ children, scroll = true, edges = [], contentStyle, refreshControl }: ScreenProps) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  // The bottom inset (home indicator / gesture bar) is added inside the scroll
  // content rather than as outer padding, so content scrolls edge to edge but
  // the last item always ends above the indicator with room to spare.
  const bottom = { paddingBottom: insets.bottom + (scroll ? SCROLL_BOTTOM_BUFFER : spacing.xl) };
  return (
    <SafeAreaView edges={edges.filter((e) => e !== 'bottom')} style={styles.screen}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.screenContent, contentStyle, bottom]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={refreshControl}
          scrollIndicatorInsets={{ bottom: insets.bottom }}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.screenContent, styles.flex, contentStyle, bottom]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style, onPress, accessibilityLabel }: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const styles = useStyles();
  if (!onPress) return <View style={[styles.card, style]}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.card, style, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  const styles = useStyles();
  const { typography } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text accessibilityRole="header" style={typography.label}>
        {title.toLocaleUpperCase()}
      </Text>
      {action}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

function buttonColors(variant: ButtonVariant, colors: Palette) {
  switch (variant) {
    case 'primary':
      return { bg: colors.primary, fg: colors.onPrimary };
    case 'secondary':
      return { bg: colors.primarySoft, fg: colors.primary };
    case 'ghost':
      return { bg: 'transparent', fg: colors.primary };
    case 'danger':
      return { bg: colors.dangerSoft, fg: colors.danger };
  }
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ label, onPress, variant = 'primary', icon, disabled, loading, style }: ButtonProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const palette = buttonColors(variant, colors);
  const inactive = disabled === true || loading === true;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading === true }}
      disabled={inactive}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.bg, opacity: inactive ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={palette.fg} /> : null}
          <Text style={[styles.buttonLabel, { color: palette.fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({ icon, label, onPress, color }: { icon: IconName; label: string; onPress: () => void; color?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      onPress={onPress}
      style={({ pressed }) => ({ padding: spacing.xs, opacity: pressed ? 0.6 : 1 })}
    >
      <Ionicons name={icon} size={22} color={color ?? colors.textMuted} />
    </Pressable>
  );
}

/** A "go deeper" chevron that points the right way in RTL. */
export function Chevron() {
  const { colors } = useTheme();
  const t = useT();
  return <Ionicons name={t.isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textMuted} />;
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string | null;
  footer?: string;
}

export function TextField({ label, error, footer, style, multiline, ...rest }: TextFieldProps) {
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const t = useT();
  return (
    <View style={styles.field}>
      {label ? <Text style={typography.label}>{label.toLocaleUpperCase()}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          { textAlign: t.isRTL ? 'right' : 'left' },
          error ? { borderColor: colors.danger } : null,
          style,
        ]}
        accessibilityLabel={label ?? rest.placeholder}
        {...rest}
      />
      {error ? <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text> : null}
      {!error && footer ? <Text style={typography.caption}>{footer}</Text> : null}
    </View>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.segmented} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              haptics.tap();
              onChange(o.value);
            }}
            style={[styles.segment, active && { backgroundColor: colors.surface }]}
          >
            <Text style={[styles.segmentLabel, { color: active ? colors.text : colors.textMuted }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stepper({ value, min, max, step = 1, onChange, format }: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
}) {
  const styles = useStyles();
  const { typography, colors } = useTheme();
  return (
    <View style={styles.stepper}>
      <IconButton icon="remove-circle-outline" label="−" color={colors.primary} onPress={() => onChange(Math.max(min, value - step))} />
      <Text style={[typography.subheading, styles.stepperValue]} accessibilityLiveRegion="polite">
        {format ? format(value) : value}
      </Text>
      <IconButton icon="add-circle-outline" label="+" color={colors.primary} onPress={() => onChange(Math.min(max, value + step))} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

export function ProgressBar({ value, color, height = 8 }: { value: number; color?: string; height?: number }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.track, { height, borderRadius: height / 2 }]}
    >
      <View style={{ width: `${clamped * 100}%`, height, borderRadius: height / 2, backgroundColor: color ?? colors.primary }} />
    </View>
  );
}

export function Chip({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const map = {
    neutral: [colors.surfaceMuted, colors.textMuted],
    primary: [colors.primarySoft, colors.primary],
    success: [colors.successSoft, colors.success],
    warning: [colors.warningSoft, colors.warning],
    danger: [colors.dangerSoft, colors.danger],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.chipLabel, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function StatTile({ label, value, icon }: { label: string; value: string | number; icon?: IconName }) {
  const styles = useStyles();
  const { colors, typography } = useTheme();
  return (
    <View style={styles.statTile} accessible accessibilityLabel={`${label}: ${value}`}>
      {icon ? <Ionicons name={icon} size={18} color={colors.primary} /> : null}
      <Text style={typography.heading}>{value}</Text>
      <Text style={typography.caption} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: IconName; title: string; body: string; action?: ReactNode }) {
  const styles = useStyles();
  const { colors, typography } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={30} color={colors.primary} />
      </View>
      <Text style={[typography.heading, styles.centerText]}>{title}</Text>
      <Text style={[typography.caption, styles.centerText]}>{body}</Text>
      {action}
    </View>
  );
}

export function LoadingState({ label }: { label?: string }) {
  const styles = useStyles();
  const { colors, typography } = useTheme();
  return (
    <View style={styles.empty} accessibilityLiveRegion="polite">
      <ActivityIndicator color={colors.primary} size="large" />
      {label ? <Text style={[typography.caption, styles.centerText]}>{label}</Text> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  return (
    <View style={styles.empty} accessibilityRole="alert">
      <Ionicons name="cloud-offline-outline" size={32} color={colors.danger} />
      <Text style={[typography.body, styles.centerText]}>{message}</Text>
      {onRetry ? <Button label={t('common.retry')} variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

export function InlineError({ message }: { message: string | null | undefined }) {
  const styles = useStyles();
  const { colors, typography } = useTheme();
  if (!message) return null;
  return (
    <View style={styles.inlineError} accessibilityRole="alert">
      <Ionicons name="alert-circle" size={18} color={colors.danger} />
      <Text style={[typography.caption, { color: colors.danger, flex: 1 }]}>{message}</Text>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.background },
  screenContent: { padding: spacing.lg, gap: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.85 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonLabel: { fontSize: 16, fontWeight: '700' },
  field: { gap: spacing.xs },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
  },
  inputMultiline: { minHeight: 160, textAlignVertical: 'top', lineHeight: 23 },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: 3,
  },
  segment: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  segmentLabel: { fontSize: 14, fontWeight: '600' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepperValue: { minWidth: 56, textAlign: 'center' },
  track: { backgroundColor: colors.surfaceMuted, overflow: 'hidden', flex: 1 },
  chip: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  chipLabel: { fontSize: 12, fontWeight: '700' },
  statTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 2,
    // Shrink-wrap children so numbers (dir="auto" on web) sit at the start edge in RTL too.
    alignItems: 'flex-start',
  },
  empty: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: { textAlign: 'center' },
  inlineError: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
}));
