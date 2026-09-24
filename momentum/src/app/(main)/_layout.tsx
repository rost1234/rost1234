import { Redirect, Stack } from 'expo-router';
import { useQuickActionRouting } from 'expo-quick-actions/router';
import { useTheme } from '@/components/theme';
import { handleQuickAction } from '@/services/quickActions';
import { useSettingsStore } from '@/state/settingsStore';

/**
 * One home screen; everything else opens on top of it and closes back to it
 * (Android back / swipe down / ✕). No tab bar to navigate.
 */
export default function MainLayout() {
  const isOnboarded = useSettingsStore((s) => s.settings?.isOnboardingCompleted ?? false);
  const { colors } = useTheme();
  // App-icon shortcuts; handled here (not in the root layout) so navigation is ready.
  useQuickActionRouting((action) => (isOnboarded ? handleQuickAction(action) : true));
  if (!isOnboarded) return <Redirect href="/onboarding" />;

  const sheet = { presentation: 'modal', animation: 'slide_from_bottom', contentStyle: { backgroundColor: colors.background } } as const;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="focus" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="analytics" options={sheet} />
      <Stack.Screen name="library" options={sheet} />
      <Stack.Screen name="settings" options={sheet} />
    </Stack>
  );
}
