import { Stack } from 'expo-router';
import { Screen } from '@/components/ui';
import { SettingsContent } from '@/features/settings/SettingsContent';
import { useT } from '@/i18n';

export default function SettingsScreen() {
  const t = useT();
  return (
    <>
      <Stack.Screen options={{ title: t('tabs.settings') }} />
      <Screen>
        <SettingsContent />
      </Screen>
    </>
  );
}
