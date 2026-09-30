import { View } from 'react-native';
import { Screen, StatTile } from '@/components/ui';
import { TabHeader } from '@/components/TabHeader';
import { useStudyStats } from '@/data/study';
import { AccessibilitySettings } from '@/features/me/AccessibilitySettings';
import { GoalSettings } from '@/features/me/GoalSettings';
import { SettingsContent } from '@/features/settings/SettingsContent';
import { useT } from '@/i18n';
import { spacing } from '@/theme';

/** Me: progress at a glance, goals, accessibility, and all other settings. */
export default function MeTab() {
  const t = useT();
  const s = useStudyStats().data;
  return (
    <Screen edges={['top']}>
      <TabHeader title={t('tabs.me')} />
      {s ? (
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <StatTile icon="albums-outline" label={t('today.cards')} value={s.total_cards} />
          <StatTile icon="bulb-outline" label={t('today.concepts')} value={s.total_concepts} />
          <StatTile icon="flame-outline" label={t('me.streak')} value={s.streak_days} />
        </View>
      ) : null}
      <GoalSettings />
      <AccessibilitySettings />
      <SettingsContent />
    </Screen>
  );
}
