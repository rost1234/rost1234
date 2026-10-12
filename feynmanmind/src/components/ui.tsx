import type { ComponentProps, ReactNode, Ref } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { Backdrop } from '@/components/Backdrop';
import { SketchBorder, Squiggle, useSeed } from '@/components/sketch';
import { Text, TextInput } from '@/components/Text';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { makeStyles, radius, spacing, useTheme, type Look, type Palette } from '@/theme';
import { useBottomInset } from '@/lib/safeArea';

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
  /** For screens that scroll themselves to a spot (e.g. the current station on a map). */
  scrollRef?: Ref<ScrollView>;
}

/** Extra space below the last item so it can be scrolled well clear of the screen edge. */
export const SCROLL_BOTTOM_BUFFER = 96;

export function Screen({ children, scroll = true, edges = [], contentStyle, refreshControl, scrollRef }: ScreenProps) {
  const styles = useStyles();
  const bottomInset = useBottomInset();
  // The bottom inset (home indicator / gesture bar) is added inside the scroll
  // content rather than as outer padding, so content scrolls edge to edge but
  // the last item always ends above the indicator with room to spare.
  const bottom = { paddingBottom: bottomInset + (scroll ? SCROLL_BOTTOM_BUFFER : spacing.xl) };
  return (
    <SafeAreaView edges={edges.filter((e) => e !== 'bottom')} style={styles.screen}>
      <Backdrop />
      {scroll ? (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.screenContent, contentStyle, bottom]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={refreshControl}
          scrollIndicatorInsets={{ bottom: bottomInset }}
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
  const { look } = useTheme();
  const seed = useSeed();
  // On the chalkboard the outline is drawn by hand (in the card's border color, if it sets one).
  const outline = look === 'chalk' ? <SketchBorder color={chalkOutline(style)} seed={seed} radius={14} /> : null;
  if (!onPress)
    return (
      <View style={[styles.card, style, look === 'chalk' && styles.noBorder]}>
        {outline}
        {children}
      </View>
    );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.card, style, look === 'chalk' && styles.noBorder, pressed && styles.pressed]}
    >
      {outline}
      {children}
    </Pressable>
  );
}

const CHALK_LINE = 'rgba(238,240,232,0.78)';
/** The chalk outline's color: the border color a card's style asks for, or white chalk. */
function chalkOutline(style: StyleProp<ViewStyle>): string {
  const color = StyleSheet.flatten(style)?.borderColor;
  return typeof color === 'string' ? color : CHALK_LINE;
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  const styles = useStyles();
  const { typography, look, colors } = useTheme();
  if (look === 'classic')
    return (
      <View style={styles.sectionHeader}>
        <Text accessibilityRole="header" style={typography.label}>
          {title.toLocaleUpperCase()}
        </Text>
        {action}
      </View>
    );
  return (
    <View style={styles.sectionHeader}>
      {look === 'chalk' ? (
        // A chalk heading underlined with a quick wavy stroke.
        <View style={{ alignSelf: 'flex-start' }}>
          <Text accessibilityRole="header" style={typography.label}>
            {title}
          </Text>
          <Squiggle color={colors.ink} height={7} style={{ marginTop: -2, opacity: 0.8 }} />
        </View>
      ) : (
        <Text accessibilityRole="header" style={typography.label}>
          {title}
        </Text>
      )}
      {/* On paper, a section heading sits on a thin red rule, like a ruled notebook heading. */}
      {look === 'paper' ? <View style={styles.sectionRule} /> : <View style={{ flex: 1 }} />}
      {action}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

function buttonColors(variant: ButtonVariant, colors: Palette, look: Look) {
  switch (variant) {
    case 'primary':
      return { bg: colors.button, fg: colors.onButton };
    case 'secondary':
      return look === 'classic' ? { bg: colors.primarySoft, fg: colors.primary } : { bg: 'transparent', fg: colors.text };
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
  const { colors, look } = useTheme();
  const palette = buttonColors(variant, colors, look);
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
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        { backgroundColor: palette.bg, opacity: inactive ? 0.5 : pressed ? 0.85 : 1 },
        pressed && variant === 'primary' && styles.buttonPressed,
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
  const { colors, typography, look } = useTheme();
  const seed = useSeed();
  return (
    <View style={[styles.statTile, look === 'chalk' && styles.noBorder]} accessible accessibilityLabel={`${label}: ${value}`}>
      {look === 'chalk' ? <SketchBorder color={CHALK_LINE} seed={seed} radius={14} /> : null}
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

const useStyles = makeStyles(({ colors, look, fonts }) => ({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.background },
  screenContent: { padding: spacing.lg, gap: spacing.lg },
  card:
    look === 'paper'
      ? {
          // A sheet of paper laid on the page.
          backgroundColor: colors.surface,
          borderRadius: 3,
          padding: spacing.lg,
          gap: spacing.sm,
          borderWidth: 1,
          borderColor: colors.border,
          boxShadow: '0px 1px 0px #CDB68A, 0px 6px 14px rgba(90,60,20,0.10)',
        }
      : look === 'chalk'
        ? { backgroundColor: 'rgba(255,255,255,0.035)', borderRadius: 14, padding: spacing.lg, gap: spacing.sm, borderWidth: 0 }
        : { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm, borderWidth: 1, borderColor: colors.border },
  // The chalk outline is an SVG drawn inside; drop the box border (a style may have set one for its color).
  noBorder: { borderWidth: 0 },
  pressed: { opacity: 0.85 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionRule: { flex: 1, height: 1, backgroundColor: 'rgba(163,48,31,0.35)' },
  button: {
    minHeight: 48,
    borderRadius: look === 'paper' ? 3 : look === 'chalk' ? 0 : radius.md,
    ...(look === 'chalk' ? { borderTopLeftRadius: 26, borderTopRightRadius: 12, borderBottomRightRadius: 24, borderBottomLeftRadius: 14 } : {}),
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  // Paper: dark ink with a red offset, like a stamped label. Chalk: a stick of yellow chalk.
  buttonPrimary: look === 'paper' ? { boxShadow: '3px 3px 0px #A3301F' } : {},
  buttonPressed: look === 'paper' ? { boxShadow: '1px 1px 0px #A3301F', transform: [{ translateX: 1 }, { translateY: 1 }] } : {},
  buttonSecondary:
    look === 'classic' ? {} : { borderWidth: look === 'chalk' ? 2 : 1.5, borderColor: look === 'chalk' ? 'rgba(238,240,232,0.7)' : colors.text, borderStyle: look === 'chalk' ? 'dashed' : 'solid' },
  buttonLabel: look === 'chalk' ? { fontSize: 26, lineHeight: 30, fontWeight: '700', fontFamily: fonts.hand } : { fontSize: 16, fontWeight: '700' },
  field: { gap: spacing.xs },
  input: {
    minHeight: 48,
    borderRadius: look === 'paper' ? 3 : radius.md,
    borderWidth: look === 'chalk' ? 2 : 1,
    borderColor: colors.border,
    backgroundColor: look === 'chalk' ? 'rgba(0,0,0,0.14)' : colors.surface,
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
    backgroundColor: look === 'chalk' ? 'rgba(255,255,255,0.035)' : colors.surface,
    borderRadius: look === 'paper' ? 3 : radius.lg,
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
