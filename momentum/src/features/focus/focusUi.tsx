import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { focusColors, radius, spacing } from '@/components/theme';
import { haptics } from '@/core/haptics';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Pill chip for the dark focus screen. */
export function FocusChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
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
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

type Variant = 'primary' | 'secondary' | 'ghost';

/** Round-cornered action button for the dark focus screen. */
export function FocusButton({
  label,
  icon,
  variant = 'secondary',
  onPress,
  style,
}: {
  label: string;
  icon?: IconName;
  variant?: Variant;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const color = variant === 'primary' ? '#0B0C1A' : variant === 'ghost' ? focusColors.textMuted : focusColors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.button, styles[variant], pressed && { opacity: 0.8 }, style]}
    >
      {icon ? <Ionicons name={icon} size={18} color={color} /> : null}
      <Text style={[styles.buttonLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

export function FocusLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    backgroundColor: focusColors.surface,
    borderWidth: 1,
    borderColor: focusColors.border,
    maxWidth: 200,
  },
  chipSelected: { backgroundColor: focusColors.surfaceActive, borderColor: focusColors.ringStart },
  chipLabel: { color: focusColors.textMuted, fontSize: 14, fontWeight: '600' },
  chipLabelSelected: { color: focusColors.text },
  button: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
  },
  primary: { backgroundColor: '#EEEEFB' },
  secondary: { backgroundColor: focusColors.surface, borderWidth: 1, borderColor: focusColors.border },
  ghost: { backgroundColor: 'transparent' },
  buttonLabel: { fontSize: 16, fontWeight: '700' },
  label: { color: focusColors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
});
