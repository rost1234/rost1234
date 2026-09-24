import { useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { runDetached } from '@/core/errors';
import { SkeletonBlock } from '@/components/Skeleton';
import { Banner, Card, Chip, SectionTitle } from '@/components/ui';
import { colors, spacing, typography } from '@/components/theme';
import { useLocalDate } from '@/hooks/useLocalDate';
import { useAnalyticsStore, type AnalyticsRange } from '@/state/analyticsStore';
import { Heatmap } from './Heatmap';
import { TrendCharts } from './TrendCharts';
import { UsageCard } from './UsageCard';

function StatTile({ value, label, tint }: { value: string; label: string; tint?: string }) {
  return (
    <Card style={styles.tile}>
      <Text style={[styles.tileValue, tint ? { color: tint } : null]}>{value}</Text>
      <Text style={typography.caption}>{label}</Text>
    </Card>
  );
}

export function AnalyticsScreen() {
  const today = useLocalDate();
  const range = useAnalyticsStore((s) => s.range);
  const data = useAnalyticsStore((s) => s.data);
  const isLoading = useAnalyticsStore((s) => s.isLoading);
  const error = useAnalyticsStore((s) => s.error);
  const setRange = useAnalyticsStore((s) => s.setRange);

  const reload = useCallback(() => runDetached(useAnalyticsStore.getState().load(today)), [today]);

  // Refresh whenever the tab gains focus (picks up new logs from the dashboard).
  useFocusEffect(reload);

  const selectRange = (next: AnalyticsRange) => {
    setRange(next);
    reload();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={false} onRefresh={reload} />}>
        <Text style={typography.title} accessibilityRole="header">
          Insights
        </Text>
        <View style={styles.rangeRow}>
          <Chip label="Week" selected={range === 'week'} onPress={() => selectRange('week')} />
          <Chip label="Month" selected={range === 'month'} onPress={() => selectRange('month')} />
        </View>
        {error ? <Banner message={error} /> : null}

        {!data && isLoading ? (
          <View style={{ gap: spacing.md }}>
            <SkeletonBlock height={72} />
            <SkeletonBlock height={140} />
            <SkeletonBlock height={200} />
          </View>
        ) : data ? (
          <>
            <View style={styles.tiles}>
              <StatTile
                value={data.averageCompletion === null ? '—' : `${Math.round(data.averageCompletion)}%`}
                label="Avg. completion"
              />
              <StatTile value={data.averageMood === null ? '—' : data.averageMood.toFixed(1)} label="Avg. mood" />
              <StatTile value={`${data.focusMinutes}`} label="Focus min" />
              <StatTile value={`🧊 ${data.freezesAvailable}`} label="Freezes left" tint={colors.freeze} />
            </View>

            <SectionTitle>Habit completion</SectionTitle>
            <Card>
              <Heatmap rows={data.heatmap} dates={data.dates} />
            </Card>

            <SectionTitle>Mood vs. habits</SectionTitle>
            <Card>
              <TrendCharts points={data.trend} />
            </Card>

            <SectionTitle>Screen time</SectionTitle>
            <UsageCard usage={data.usage} rangeLabel={range === 'week' ? '7-day' : '30-day'} />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },
  rangeRow: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.sm },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { flexGrow: 1, flexBasis: '45%', gap: 2 },
  tileValue: { fontSize: 24, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
});
