import { RefreshControl, Text, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BarChart } from '@/components/BarChart';
import { Button, Card, ErrorState, LoadingState, Screen, SectionHeader } from '@/components/ui';
import { useStudyStats } from '@/data/study';
import { useT } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { formatWeekday } from '@/lib/format';
import { spacing, useTheme } from '@/theme';

export default function ReviewTab() {
  const t = useT();
  const { colors, typography } = useTheme();
  const stats = useStudyStats();

  return (
    <Screen refreshControl={<RefreshControl refreshing={stats.isRefetching} onRefresh={() => void stats.refetch()} tintColor={colors.primary} />}>
      <Card style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl }}>
        <Ionicons name="albums" size={40} color={colors.primary} />
        <Text style={typography.heading}>{t('review.title')}</Text>
        <Text style={[typography.caption, { textAlign: 'center' }]}>{t('review.body')}</Text>
        {stats.isPending ? (
          <LoadingState />
        ) : stats.isError ? (
          <ErrorState message={errorMessage(stats.error, t)} onRetry={() => void stats.refetch()} />
        ) : (
          <View style={{ alignSelf: 'stretch', gap: spacing.md, alignItems: 'center' }}>
            <Text style={typography.subheading}>
              {stats.data.due_now > 0 ? t.plural('review.dueNow', stats.data.due_now) : t('review.nothingDue')}
            </Text>
            <Button
              label={t('review.start')}
              icon="play"
              onPress={() => router.push('/study')}
              disabled={stats.data.due_now === 0}
              style={{ alignSelf: 'stretch' }}
            />
          </View>
        )}
      </Card>

      {stats.data ? (
        <>
          <SectionHeader title={t('review.upcoming')} />
          <Card>
            <BarChart
              accessibilityLabel={t('review.upcoming')}
              bars={stats.data.forecast.map((d, i) => ({ key: d.date, label: formatWeekday(d.date, t), value: d.count, highlight: i === 0 }))}
            />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
