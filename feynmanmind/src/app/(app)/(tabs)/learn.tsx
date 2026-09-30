import { Screen } from '@/components/ui';
import { TabHeader } from '@/components/TabHeader';
import { ContinueCard } from '@/features/home/ContinueCard';
import { CoursesSection } from '@/features/home/CoursesSection';
import { LibrarySection } from '@/features/home/LibrarySection';
import { useT } from '@/i18n';

/** Learn: continue where you left off, learning paths, and your library. */
export default function LearnTab() {
  const t = useT();
  return (
    <Screen edges={['top']}>
      <TabHeader title={t('tabs.learn')} />
      <ContinueCard />
      <CoursesSection />
      <LibrarySection />
    </Screen>
  );
}
