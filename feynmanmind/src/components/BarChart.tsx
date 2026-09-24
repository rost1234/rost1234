import { Text, View } from 'react-native';
import { spacing, useTheme } from '@/theme';

export interface Bar {
  key: string;
  label: string;
  value: number;
  highlight?: boolean;
}

/** Minimal vertical bar chart (7 bars) with values above each bar. */
export function BarChart({ bars, height = 96, accessibilityLabel }: { bars: Bar[]; height?: number; accessibilityLabel: string }) {
  const { colors, typography } = useTheme();
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <View
      accessible
      accessibilityLabel={`${accessibilityLabel}: ${bars.map((b) => `${b.label} ${b.value}`).join(', ')}`}
      style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, height: height + 40 }}
    >
      {bars.map((b) => (
        <View key={b.key} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
          <Text style={[typography.caption, { fontSize: 11 }]}>{b.value > 0 ? b.value : ''}</Text>
          <View
            style={{
              width: '70%',
              height: Math.max(4, (b.value / max) * height),
              borderRadius: 6,
              backgroundColor: b.value === 0 ? colors.surfaceMuted : b.highlight ? colors.primary : colors.primarySoft,
            }}
          />
          <Text style={[typography.caption, { fontSize: 11, fontWeight: b.highlight ? '700' : '400' }]}>{b.label}</Text>
        </View>
      ))}
    </View>
  );
}
