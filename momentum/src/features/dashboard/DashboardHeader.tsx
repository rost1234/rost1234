import { StyleSheet, Text, View } from 'react-native';
import { ProgressBar } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/components/theme';
import { formatFriendlyDate, type LocalDateString } from '@/core/localDate';

interface DashboardHeaderProps {
  today: LocalDateString;
  percent: number;
  freezes: number;
}

export function DashboardHeader({ today, percent, freezes }: DashboardHeaderProps) {
  const message = percent >= 100 ? 'All done. Beautiful work.' : percent > 0 ? 'Keep the momentum going.' : 'Small steps, every day.';
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={typography.caption}>Today</Text>
          <Text style={typography.title} accessibilityRole="header">
            {formatFriendlyDate(today)}
          </Text>
        </View>
        <View style={styles.freezePill} accessibilityLabel={`${freezes} streak freezes available`}>
          <Text style={styles.freezeText}>🧊 {freezes}</Text>
        </View>
      </View>
      <View style={styles.progressRow}>
        <View style={{ flex: 1 }}>
          <ProgressBar value={percent / 100} height={10} color={percent >= 100 ? colors.success : colors.primary} />
        </View>
        <Text style={styles.percent}>{percent}%</Text>
      </View>
      <Text style={typography.caption}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center' },
  freezePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.freezeSoft,
  },
  freezeText: { fontWeight: '700', color: colors.freeze },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  percent: { ...typography.label, minWidth: 44, textAlign: 'right', fontVariant: ['tabular-nums'] },
});
