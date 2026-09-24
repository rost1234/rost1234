import { Text, View } from 'react-native';
import { Card, ProgressBar } from '@/components/ui';
import { makeStyles, spacing, useTheme } from '@/components/theme';
import { DAILY_USAGE_GOAL_SECONDS, formatDuration, type UsageSummary } from '@/domain/usage';
import { useT } from '@/i18n';

/** Passive, no-nag readout of how much time Momentum itself took. */
export function UsageCard({ usage, rangeLabel }: { usage: UsageSummary; rangeLabel: string }) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const underGoal = usage.todaySeconds <= DAILY_USAGE_GOAL_SECONDS;
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Text style={typography.label}>{t('usage.today')}</Text>
        <Text style={[styles.value, { color: underGoal ? colors.success : colors.warning }]}>
          {formatDuration(usage.todaySeconds)}
        </Text>
      </View>
      <ProgressBar
        value={usage.todaySeconds / DAILY_USAGE_GOAL_SECONDS}
        color={underGoal ? colors.success : colors.warning}
      />
      <Text style={typography.caption}>
        {t('usage.goal', { goal: formatDuration(DAILY_USAGE_GOAL_SECONDS) })}
        {usage.averageSeconds !== null ? t('usage.avg', { range: rangeLabel, avg: formatDuration(usage.averageSeconds) }) : ''}
        {usage.daysTracked > 0 ? t('usage.over', { over: usage.daysOverGoal, tracked: usage.daysTracked }) : ''}
      </Text>
    </Card>
  );
}

const useStyles = makeStyles(() => ({
  card: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  value: { fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
}));
