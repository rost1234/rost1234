import { router } from 'expo-router';
import { Button, EmptyState, Screen } from '@/components/ui';
import { TabHeader } from '@/components/TabHeader';
import { useStudyStats } from '@/data/study';
import { ReviewCalendar } from '@/features/home/ReviewCalendar';
import { TodaySection } from '@/features/home/TodaySection';
import { FocusedReview } from '@/features/review/FocusedReview';
import { ReviewSettings } from '@/features/review/ReviewSettings';
import { useT } from '@/i18n';

/** Review: today's queue, focused reviews, the calendar and the review settings. */
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
        <TodaySection>
          <FocusedReview />
          <ReviewCalendar />
        </TodaySection>
      )}
      <ReviewSettings />
    </Screen>
  );
}
