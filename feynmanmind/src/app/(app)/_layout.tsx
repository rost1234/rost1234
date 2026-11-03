import { Stack } from 'expo-router';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

export default function AppLayout() {
  const t = useT();
  const { colors, fonts, look } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.chrome },
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text, fontFamily: fonts.heading, fontWeight: '700', fontSize: look === 'chalk' ? 30 : look === 'paper' ? 19 : 17 },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="course/[id]/index" options={{ title: '' }} />
      <Stack.Screen name="course/[id]/[key]" options={{ title: '' }} />
      <Stack.Screen name="course/[id]/placement" options={{ title: '', presentation: 'modal' }} />
      <Stack.Screen name="subject/[id]" options={{ title: '' }} />
      <Stack.Screen name="concept/[id]/index" options={{ title: t('nav.concept') }} />
      <Stack.Screen name="concept/[id]/explain" options={{ title: t('nav.explain') }} />
      <Stack.Screen name="concept/[id]/generate" options={{ title: t('nav.generate'), presentation: 'modal' }} />
      <Stack.Screen name="card/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="session/[id]" options={{ title: t('nav.session') }} />
      <Stack.Screen name="study" options={{ title: t('nav.study'), presentation: 'fullScreenModal', gestureEnabled: false }} />
      <Stack.Screen name="cards/index" options={{ title: t('cards.title') }} />
      <Stack.Screen name="print/index" options={{ title: t('print.title') }} />
      <Stack.Screen name="print/results" options={{ title: t('print.resultsNav') }} />
      <Stack.Screen name="import" options={{ title: t('import.nav'), presentation: 'modal' }} />
      <Stack.Screen name="new-course" options={{ title: t('quick.course'), presentation: 'modal' }} />
      <Stack.Screen name="how-it-works" options={{ headerShown: false, presentation: 'modal' }} />
    </Stack>
  );
}
