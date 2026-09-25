import { useCallback } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { runDetached } from '@/core/errors';
import { SheetHeader } from '@/components/SheetHeader';
import { SkeletonBlock } from '@/components/Skeleton';
import { Banner, Card, Chip, SectionTitle } from '@/components/ui';
import { makeStyles, spacing, useTheme } from '@/components/theme';
import { useLocalDate } from '@/hooks/useLocalDate';
import { useAnalyticsStore, type AnalyticsRange } from '@/state/analyticsStore';
import { Heatmap } from './Heatmap';
import { TrendCharts } from './TrendCharts';
import { SoundExperimentCard } from './SoundExperimentCard';
import { UsageCard } from './UsageCard';
import { useT } from '@/i18n';
import { useBottomSpace } from '@/components/useBottomSpace';

function StatTile({ value, label, tint }: { value: string; label: string; tint?: string }) {
  const { typography } = useTheme();
  const styles = useStyles();
  return (
    <Card style={styles.tile}>
      <Text style={[styles.tileValue, tint ? { color: tint } : null]}>{value}</Text>
      <Text style={typography.caption}>{label}</Text>
    </Card>
  );
}

export function AnalyticsScreen() {
  const t = useT();
  const { colors } = useTheme();
  const styles = useStyles();
  const bottomSpace = useBottomSpace();
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
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomSpace }]} refreshControl={<RefreshControl refreshing={false} onRefresh={reload} />}>
        <SheetHeader title={t('ins.title')} />
        <View style={styles.rangeRow}>
          <Chip label={t('ins.week')} selected={range === 'week'} onPress={() => selectRange('week')} />
          <Chip label={t('ins.month')} selected={range === 'month'} onPress={() => selectRange('month')} />
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
                label={t('ins.avgCompletion')}
              />
              <StatTile value={data.averageMood === null ? '—' : data.averageMood.toFixed(1)} label={t('ins.avgMood')} />
              <StatTile value={`${data.focusMinutes}`} label={t('ins.focusMin')} />
              <StatTile value={`🧊 ${data.freezesAvailable}`} label={t('ins.freezesLeft')} tint={colors.freeze} />
            </View>

            <SectionTitle>{t('ins.habitCompletion')}</SectionTitle>
            <Card>
              <Heatmap rows={data.heatmap} dates={data.dates} />
            </Card>

            <SectionTitle>{t('ins.moodVsHabits')}</SectionTitle>
            <Card>
              <TrendCharts points={data.trend} />
            </Card>

            <SectionTitle>{t('ins.screenTime')}</SectionTitle>
            <UsageCard usage={data.usage} rangeLabel={range === 'week' ? t('ins.range7') : t('ins.range30')} />

            <SectionTitle>{t('exp.title')}</SectionTitle>
            <SoundExperimentCard experiment={data.soundExperiment} />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.sm },
  rangeRow: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.sm },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { flexGrow: 1, flexBasis: '45%', gap: 2 },
  tileValue: { fontSize: 24, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
}));
