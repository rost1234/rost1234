import { Text, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BarChart } from '@/components/BarChart';
import { ScoreRing } from '@/components/ScoreRing';
import { Button, Card, Chevron, ErrorState, LoadingState, SectionHeader, StatTile } from '@/components/ui';
import { useWeakConcepts } from '@/data/concepts';
import { useStudyStats } from '@/data/study';
import { useT } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { formatWeekday } from '@/lib/format';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

/** Due cards, streak and today's numbers. Hidden until the library has content. */
export function TodaySection() {
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const stats = useStudyStats();
  const weak = useWeakConcepts();

  if (stats.isPending) return <LoadingState />;
  if (stats.isError) return <ErrorState message={errorMessage(stats.error, t)} onRetry={() => void stats.refetch()} />;
  const s = stats.data;
  if (s.total_concepts === 0) return null;

  return (
    <>
      <View style={[styles.hero, s.due_now === 0 && styles.heroCalm]}>
        <View style={styles.heroTop}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text style={[typography.heading, styles.heroText]}>{s.due_now > 0 ? t.plural('today.due', s.due_now) : t('today.caughtUp')}</Text>
            <Text style={[typography.caption, styles.heroSub]}>
              {s.due_now > 0
                ? s.due_today > s.due_now
                  ? t('today.dueLater', { count: s.due_today - s.due_now })
                  : t('review.body')
                : t('today.caughtUpBody')}
            </Text>
          </View>
          {s.streak_days > 0 ? (
            <View style={styles.streak} accessible accessibilityLabel={t.plural('today.streak', s.streak_days)}>
              <Ionicons name="flame" size={18} color={colors.accent} />
              <Text style={[typography.subheading, { color: colors.accent }]}>{s.streak_days}</Text>
            </View>
          ) : null}
        </View>
        {s.due_now > 0 ? <Button label={t('today.startReview')} icon="play" variant="secondary" onPress={() => router.push('/study')} /> : null}
      </View>

      <View style={styles.tiles}>
        <StatTile icon="checkmark-done-outline" label={t('today.reviewedToday')} value={s.reviewed_today} />
        <StatTile
          icon="sparkles-outline"
          label={t('today.accuracy')}
          value={s.reviewed_today ? `${Math.round((s.correct_today / s.reviewed_today) * 100)}%` : '–'}
        />
      </View>
      <View style={styles.tiles}>
        <StatTile icon="albums-outline" label={t('today.cards')} value={s.total_cards} />
        <StatTile icon="bulb-outline" label={t('today.concepts')} value={s.total_concepts} />
        <StatTile icon="trending-up-outline" label={t('today.mastery')} value={`${s.avg_mastery}%`} />
      </View>

      {weak.data && weak.data.length > 0 ? (
        <>
          <SectionHeader title={t('today.weakTitle')} />
          <Text style={typography.caption}>{t('today.weakBody')}</Text>
          {weak.data.map((c) => (
            <Card key={c.id} onPress={() => router.push(`/concept/${c.id}/explain`)} accessibilityLabel={c.title}>
              <View style={styles.row}>
                <ScoreRing score={c.mastery_level} size={48} stroke={5} caption={t('concept.mastery')} />
                <View style={{ flex: 1 }}>
                  <Text style={typography.subheading} numberOfLines={1}>
                    {c.title}
                  </Text>
                  <Text style={typography.caption} numberOfLines={1}>
                    {c.subjectTitle}
                  </Text>
                </View>
                <Chevron />
              </View>
            </Card>
          ))}
        </>
      ) : null}
    </>
  );
}

/** 7-day forecast and history charts. */
export function ProgressSection() {
  const t = useT();
  const stats = useStudyStats();
  if (!stats.data || stats.data.total_cards === 0) return null;
  const s = stats.data;
  return (
    <>
      <SectionHeader title={t('today.forecast')} />
      <Card>
        <BarChart
          accessibilityLabel={t('today.forecast')}
          bars={s.forecast.map((d, i) => ({ key: d.date, label: formatWeekday(d.date, t), value: d.count, highlight: i === 0 }))}
        />
      </Card>
      <SectionHeader title={t('today.history')} />
      <Card>
        <BarChart
          accessibilityLabel={t('today.history')}
          bars={s.history.map((d, i, all) => ({ key: d.date, label: formatWeekday(d.date, t), value: d.count, highlight: i === all.length - 1 }))}
        />
      </Card>
    </>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  hero: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.lg },
  heroCalm: { backgroundColor: colors.success },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  heroText: { color: colors.onPrimary },
  heroSub: { color: colors.onPrimary, opacity: 0.85 },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  tiles: { flexDirection: 'row', gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
}));
