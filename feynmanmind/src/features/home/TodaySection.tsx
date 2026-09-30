import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScoreRing } from '@/components/ScoreRing';
import { Button, Card, Chevron, ErrorState, LoadingState, SectionHeader, StatTile } from '@/components/ui';
import { useWeakConcepts } from '@/data/concepts';
import { useStudyStats } from '@/data/study';
import { useT } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

/** Due cards and today's numbers (anything passed as children goes right below the due-cards card). Hidden until the library has content. */
export function TodaySection({ children }: { children?: ReactNode }) {
  const t = useT();
  const styles = useStyles();
  const { typography } = useTheme();
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
        </View>
        {s.due_now > 0 ? <Button label={t('today.startReview')} icon="play" variant="secondary" onPress={() => router.push('/study')} /> : null}
      </View>

      {children}

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
