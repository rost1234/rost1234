import { Pressable, Text, View } from 'react-native';
import { haptics } from '@/lib/haptics';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

export interface ChoiceChip<T extends string> {
  value: T;
  label: string;
}

/** A wrapping row of pill buttons. With `value`, one is selected (a filter); without, each is an action. */
export function ChoiceChips<T extends string>({ options, value, onChange, label }: { options: ChoiceChip<T>[]; value?: T; onChange: (v: T) => void; label?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.row} accessibilityLabel={label} accessibilityRole={value !== undefined ? 'radiogroup' : undefined}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole={value !== undefined ? 'radio' : 'button'}
            accessibilityState={value !== undefined ? { selected: on } : undefined}
            onPress={() => {
              haptics.tap();
              onChange(o.value);
            }}
            style={({ pressed }) => [styles.chip, on && { backgroundColor: colors.primary, borderColor: colors.primary }, pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.text, { color: on ? colors.onPrimary : value !== undefined ? colors.text : colors.primary }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles(({ colors, textScale }) => ({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    minHeight: 40,
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  text: { fontWeight: '700', fontSize: Math.round(14 * textScale) },
}));
