import { useEffect } from 'react';
import { I18nManager, Platform, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Button } from '@/components/ui';
import '@/data/local';
import { resolveLanguage, useT } from '@/i18n';
import { queryClient } from '@/lib/queryClient';
import { useDBStore } from '@/local/store';
import { configureNotifications, syncDailyReminder } from '@/services/reminders';
import { useHydrated, usePrefsStore } from '@/state/prefsStore';
import { spacing, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});
configureNotifications();

/** Route-level error boundary: catches render errors anywhere below the root. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const t = useT();
  const { colors, typography } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl, backgroundColor: colors.background }}>
      <Text style={typography.heading}>{t('error.title')}</Text>
      <Text style={[typography.caption, { textAlign: 'center' }]}>{error.message}</Text>
      <Button label={t('common.retry')} onPress={() => void retry()} />
    </View>
  );
}

/** Applies Hebrew right-to-left layout. Native picks up a change on the next launch. */
function useTextDirection() {
  const language = usePrefsStore((s) => s.language);
  useEffect(() => {
    const rtl = resolveLanguage(language) === 'he';
    if (Platform.OS === 'web') {
      document.documentElement.dir = rtl ? 'rtl' : 'ltr';
      document.documentElement.lang = rtl ? 'he' : 'en';
      return;
    }
    I18nManager.allowRTL(true);
    if (I18nManager.isRTL !== rtl) I18nManager.forceRTL(rtl);
  }, [language]);
}

function RootNavigator() {
  const prefsReady = useHydrated(usePrefsStore);
  const dbReady = useHydrated(useDBStore);
  const ready = prefsReady && dbReady;
  const onboardingDone = usePrefsStore((s) => s.onboardingDone);
  const remindersEnabled = usePrefsStore((s) => s.remindersEnabled);
  const reminderHour = usePrefsStore((s) => s.reminderHour);
  const language = usePrefsStore((s) => s.language);
  const { colors } = useTheme();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Keep the daily reminder in sync with settings and the UI language.
  useEffect(() => {
    syncDailyReminder(remindersEnabled, reminderHour).catch(() => {});
  }, [remindersEnabled, reminderHour, language]);

  if (!ready) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Protected guard={!onboardingDone}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={onboardingDone}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const { isDark } = useTheme();
  useTextDirection();
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <RootNavigator />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
