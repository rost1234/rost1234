import { Screen, SectionHeader } from '@/components/ui';
import { TabHeader } from '@/components/TabHeader';
import { ProgressOverview } from '@/features/me/ProgressOverview';
import { SettingsContent } from '@/features/settings/SettingsContent';
import { useT } from '@/i18n';

/** Me: progress and achievements first, then every setting in groups that open in place. */
export default function MeTab() {
  const t = useT();
  return (
    <Screen edges={['top']}>
      <TabHeader title={t('tabs.me')} />
      <ProgressOverview />
      <SectionHeader title={t('tabs.settings')} />
      <SettingsContent />
    </Screen>
  );
}
