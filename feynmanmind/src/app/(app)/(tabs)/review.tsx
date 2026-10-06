import { router } from 'expo-router';
import { Button, EmptyState, Screen } from '@/components/ui';
import { TabHeader } from '@/components/TabHeader';
import { useStudyStats } from '@/data/study';
import { Forecast, ReviewFilters, ReviewHero, WeekStrip } from '@/features/review/ReviewOverview';
import { ReviewSettings } from '@/features/review/ReviewSettings';
import { WeakConcepts } from '@/features/review/WeakConcepts';
import { useT } from '@/i18n';

/** Review: how many cards wait and a start button, quick filters, this week, the coming days, and the settings. */
export default function ReviewTab() {
  const t = useT();
  const stats = useStudyStats();
  return (
    <Screen edges={['top']}>
      <TabHeader title={t('tabs.review')} />
      {stats.data && stats.data.total_cards === 0 ? (
        <EmptyState
          icon="albums-outline"
          title={t('home.noReviewsTitle')}
          body={t('home.noReviewsBody')}
          action={<Button label={t('home.goLearn')} icon="book-outline" onPress={() => router.navigate('/learn')} />}
        />
      ) : (
        <>
          <ReviewHero />
          <ReviewFilters />
          <WeekStrip />
          <Forecast />
          <WeakConcepts />
        </>
      )}
      <ReviewSettings />
    </Screen>
  );
}
