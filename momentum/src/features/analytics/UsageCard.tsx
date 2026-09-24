import { StyleSheet, Text, View } from 'react-native';
import { Card, ProgressBar } from '@/components/ui';
import { colors, spacing, typography } from '@/components/theme';
import { DAILY_USAGE_GOAL_SECONDS, formatDuration, type UsageSummary } from '@/domain/usage';

/** Passive, no-nag readout of how much time Momentum itself took. */
export function UsageCard({ usage, rangeLabel }: { usage: UsageSummary; rangeLabel: string }) {
  const underGoal = usage.todaySeconds <= DAILY_USAGE_GOAL_SECONDS;
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Text style={typography.label}>Time in Momentum today</Text>
        <Text style={[styles.value, { color: underGoal ? colors.success : colors.warning }]}>
          {formatDuration(usage.todaySeconds)}
        </Text>
      </View>
      <ProgressBar
        value={usage.todaySeconds / DAILY_USAGE_GOAL_SECONDS}
        color={underGoal ? colors.success : colors.warning}
      />
      <Text style={typography.caption}>
        Goal: under {formatDuration(DAILY_USAGE_GOAL_SECONDS)} a day
        {usage.averageSeconds !== null ? ` · ${rangeLabel} average ${formatDuration(usage.averageSeconds)}` : ''}
        {usage.daysTracked > 0 ? ` · ${usage.daysOverGoal} of ${usage.daysTracked} days over` : ''}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  value: { fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
