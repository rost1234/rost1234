import { RefreshControl, Text, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BarChart } from '@/components/BarChart';
import { ScoreRing } from '@/components/ScoreRing';
import { Button, Card, Chevron, EmptyState, ErrorState, LoadingState, Screen, SectionHeader, StatTile } from '@/components/ui';
import { useWeakConcepts } from '@/data/concepts';
import { useStudyStats } from '@/data/study';
import { useAuth } from '@/features/auth/AuthProvider';
import { useT } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { formatWeekday, greetingKey } from '@/lib/format';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

export default function TodayScreen() {
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const { session } = useAuth();
  const stats = useStudyStats();
  const weak = useWeakConcepts();

  const refreshing = stats.isRefetching || weak.isRefetching;
  const refresh = () => {
    void stats.refetch();
    void weak.refetch();
  };

  const name = session?.user.email?.split('@')[0];

  return (
    <Screen edges={['top']} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
      <View style={styles.header}>
        <Text style={typography.caption}>{new Date().toLocaleDateString(t.locale, { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
        <Text style={typography.title} accessibilityRole="header">
          {t(greetingKey())}
          {name ? `, ${name}` : ''}
        </Text>
      </View>

      {stats.isPending ? (
        <LoadingState />
      ) : stats.isError ? (
        <ErrorState message={errorMessage(stats.error, t)} onRetry={() => void stats.refetch()} />
      ) : stats.data.total_concepts === 0 ? (
        <Card>
          <EmptyState
            icon="library-outline"
            title={t('today.emptyTitle')}
            body={t('today.emptyBody')}
            action={<Button label={t('today.goLibrary')} onPress={() => router.navigate('/library')} />}
          />
        </Card>
      ) : (
        <>
          <View style={[styles.hero, stats.data.due_now === 0 && styles.heroCalm]}>
            <View style={styles.heroTop}>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text style={[typography.heading, styles.heroText]}>
                  {stats.data.due_now > 0 ? t.plural('today.due', stats.data.due_now) : t('today.caughtUp')}
                </Text>
                <Text style={[typography.caption, styles.heroSub]}>
                  {stats.data.due_now > 0
                    ? stats.data.due_today > stats.data.due_now
                      ? t('today.dueLater', { count: stats.data.due_today - stats.data.due_now })
                      : ''
                    : t('today.caughtUpBody')}
                </Text>
              </View>
              {stats.data.streak_days > 0 ? (
                <View style={styles.streak} accessible accessibilityLabel={t.plural('today.streak', stats.data.streak_days)}>
                  <Ionicons name="flame" size={18} color={colors.accent} />
                  <Text style={[typography.subheading, { color: colors.accent }]}>{stats.data.streak_days}</Text>
                </View>
              ) : null}
            </View>
            {stats.data.due_now > 0 ? (
              <Button label={t('today.startReview')} icon="play" variant="secondary" onPress={() => router.push('/study')} />
            ) : null}
          </View>

          <View style={styles.tiles}>
            <StatTile icon="checkmark-done-outline" label={t('today.reviewedToday')} value={stats.data.reviewed_today} />
            <StatTile
              icon="sparkles-outline"
              label={t('today.accuracy')}
              value={stats.data.reviewed_today ? `${Math.round((stats.data.correct_today / stats.data.reviewed_today) * 100)}%` : '–'}
            />
          </View>
          <View style={styles.tiles}>
            <StatTile icon="albums-outline" label={t('today.cards')} value={stats.data.total_cards} />
            <StatTile icon="bulb-outline" label={t('today.concepts')} value={stats.data.total_concepts} />
            <StatTile icon="trending-up-outline" label={t('today.mastery')} value={`${stats.data.avg_mastery}%`} />
          </View>

          <SectionHeader title={t('today.forecast')} />
          <Card>
            <BarChart
              accessibilityLabel={t('today.forecast')}
              bars={stats.data.forecast.map((d, i) => ({ key: d.date, label: formatWeekday(d.date, t), value: d.count, highlight: i === 0 }))}
            />
          </Card>

          <SectionHeader title={t('today.history')} />
          <Card>
            <BarChart
              accessibilityLabel={t('today.history')}
              bars={stats.data.history.map((d, i, all) => ({
                key: d.date,
                label: formatWeekday(d.date, t),
                value: d.count,
                highlight: i === all.length - 1,
              }))}
            />
          </Card>

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
      )}
    </Screen>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  header: { gap: 2, marginTop: spacing.sm },
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
