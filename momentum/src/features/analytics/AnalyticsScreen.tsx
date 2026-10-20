import { useCallback } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { Text } from '@/components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { runDetached } from '@/core/errors';
import { SheetHeader } from '@/components/SheetHeader';
import { usePageFocusEffect } from '@/features/pager/pager';
import { SkeletonBlock } from '@/components/Skeleton';
import { Banner, Card, Chip, ProgressBar, SectionTitle } from '@/components/ui';
import type { LocalDateString } from '@/core/localDate';
import { habitTallies, progressStory, type HabitTally, type ProgressStory } from '@/domain/analytics';
import { FoldedSection } from '@/features/dashboard/FoldedSection';
import { Sprout } from '@/features/garden/Sprout';
import { makeStyles, spacing, useTheme } from '@/components/theme';
import { useLocalDate } from '@/hooks/useLocalDate';
import { useHabitStore } from '@/state/habitStore';
import { useAnalyticsStore, type AnalyticsData, type AnalyticsRange } from '@/state/analyticsStore';
import { Heatmap } from './Heatmap';
import { TrendCharts } from './TrendCharts';
import { SoundExperimentCard } from './SoundExperimentCard';
import { QuitSection } from './QuitCard';
import { SleepCard } from './SleepCard';
import { UsageCard } from './UsageCard';
import { useT } from '@/i18n';
import { useBottomSpace } from '@/components/useBottomSpace';

/** The range in a few plain sentences: how much, what went best, what was hard, and mood. */
function Story({ story, mood }: { story: ProgressStory; mood: number | null }) {
  const t = useT();
  const { typography, look } = useTheme();
  const styles = useStyles();
  const lines = [
    story.percent === null ? t('prog.noData') : t('prog.average', { percent: story.percent }),
    story.activeDays > 0 ? t('prog.activeDays', { active: story.activeDays, days: story.days }) : null,
    story.best ? t('prog.best', { title: story.best.title, done: story.best.done, due: story.best.due }) : null,
    story.hardest ? t('prog.hardest', { title: story.hardest.title }) : null,
    mood !== null ? t('prog.mood', { mood: mood.toFixed(1) }) : null,
    story.moodLift !== null && story.moodLift >= 0.5 ? t('prog.moodLift') : null,
  ].filter((l): l is string => l !== null);
  return (
    <Card style={styles.story}>
      <View style={styles.storyRow}>
        {look === 'garden' ? (
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Sprout stage={3} mood="happy" size={48} />
          </View>
        ) : null}
        <Text style={[typography.heading, { flex: 1 }]}>{t('prog.storyTitle')}</Text>
      </View>
      {lines.map((line) => (
        <Text key={line} style={typography.body}>
          {line}
        </Text>
      ))}
    </Card>
  );
}

/** One line per habit: a bar and "5 of 7". */
function HabitBars({ tallies }: { tallies: HabitTally[] }) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const shown = tallies.filter((h) => h.due > 0);
  if (shown.length === 0) return null;
  return (
    <Card style={{ gap: spacing.md }}>
      {shown.map((h) => {
        const ratio = h.done / h.due;
        return (
          <View key={h.habitId} style={{ gap: 4 }} accessible accessibilityLabel={t('prog.habitA11y', { title: h.title, done: h.done, due: h.due })}>
            <View style={styles.barHead}>
              <Text style={[typography.label, { flex: 1 }]} numberOfLines={1}>
                {h.title}
              </Text>
              <Text style={typography.caption}>{t('prog.doneOf', { done: h.done, due: h.due })}</Text>
            </View>
            <ProgressBar value={ratio} color={ratio >= 0.8 ? colors.success : colors.primary} height={8} />
          </View>
        );
      })}
    </Card>
  );
}

function ProgressBody({ data, range, today }: { data: AnalyticsData; range: AnalyticsRange; today: LocalDateString }) {
  const t = useT();
  const styles = useStyles();
  const habits = useHabitStore((s) => s.habits);
  const quitIds = new Set(habits.filter((h) => h.isQuit).map((h) => h.id));
  const story = progressStory(data.heatmap, data.trend, quitIds);
  return (
    <>
      <Story story={story} mood={data.averageMood} />
      <View style={styles.tiles}>
        <StatTile value={story.percent === null ? '—' : `${story.percent}%`} label={t('ins.avgCompletion')} />
        <StatTile value={`${story.activeDays}`} label={t('prog.activeTile')} />
        <StatTile value={`${data.focusMinutes}`} label={t('ins.focusMin')} />
      </View>

      <SectionTitle>{t('prog.perHabit')}</SectionTitle>
      {/* Habits to quit have their own clean-days card below. */}
      <HabitBars tallies={habitTallies(data.heatmap).filter((h) => !quitIds.has(h.habitId))} />

      <QuitSection today={today} />

      {/* Details for whoever wants them, folded away. */}
      <FoldedSection icon="📊" title={t('prog.details')} summary={t('prog.detailsSummary')} hint={t('prog.detailsHint')}>
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
      </FoldedSection>
      <FoldedSection icon="🧪" title={t('exp.title')} summary={t('prog.experimentsSummary')} hint={t('prog.detailsHint')}>
        <SleepCard today={today} />
        <SoundExperimentCard experiment={data.soundExperiment} />
      </FoldedSection>
    </>
  );
}

function StatTile({ value, label, tint }: { value: string; label: string; tint?: string }) {
  const { typography } = useTheme();
  const styles = useStyles();
  return (
    <Card style={styles.tile}>
      <View accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={[styles.tileValue, tint ? { color: tint } : null]}>{value}</Text>
      <Text style={typography.caption}>{label}</Text>
      </View>
    </Card>
  );
}

export function AnalyticsScreen() {
  const t = useT();
  const styles = useStyles();
  const bottomSpace = useBottomSpace();
  const today = useLocalDate();
  const range = useAnalyticsStore((s) => s.range);
  const data = useAnalyticsStore((s) => s.data);
  const isLoading = useAnalyticsStore((s) => s.isLoading);
  const error = useAnalyticsStore((s) => s.error);
  const setRange = useAnalyticsStore((s) => s.setRange);

  const reload = useCallback(() => runDetached(useAnalyticsStore.getState().load(today)), [today]);

  // Refresh whenever it comes into view (picks up new logs from Today).
  usePageFocusEffect('insights', reload);

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
            <SkeletonBlock height={90} />
            <SkeletonBlock height={72} />
            <SkeletonBlock height={200} />
          </View>
        ) : data ? (
          <ProgressBody data={data} range={range} today={today} />
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
  tile: { flexGrow: 1, flexBasis: '30%', gap: 2 },
  story: { gap: spacing.sm },
  storyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  barHead: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  tileValue: { fontSize: 24, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
}));
