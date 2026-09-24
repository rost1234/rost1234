import { Stack } from 'expo-router';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

export default function AppLayout() {
  const t = useT();
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="subject/[id]" options={{ title: t('nav.subject') }} />
      <Stack.Screen name="concept/[id]/index" options={{ title: t('nav.concept') }} />
      <Stack.Screen name="concept/[id]/explain" options={{ title: t('nav.explain') }} />
      <Stack.Screen name="concept/[id]/generate" options={{ title: t('nav.generate'), presentation: 'modal' }} />
      <Stack.Screen name="card/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="session/[id]" options={{ title: t('nav.session') }} />
      <Stack.Screen name="study" options={{ title: t('nav.study'), presentation: 'fullScreenModal', gestureEnabled: false }} />
      <Stack.Screen name="how-it-works" options={{ headerShown: false, presentation: 'modal' }} />
    </Stack>
  );
}
