import { useEffect } from 'react';
import { I18nManager, Platform, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Button, EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { resolveLanguage, useT } from '@/i18n';
import { isSupabaseConfigured } from '@/lib/env';
import { queryClient } from '@/lib/queryClient';
import { configureNotifications, syncDailyReminder } from '@/services/reminders';
import { usePrefsHydrated, usePrefsStore } from '@/state/prefsStore';
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

function SetupRequired() {
  const t = useT();
  return (
    <Screen edges={['top', 'bottom']} contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <EmptyState icon="construct-outline" title={t('setup.title')} body={t('setup.body')} />
    </Screen>
  );
}

function RootNavigator() {
  const t = useT();
  const { session, status, retry } = useAuth();
  const prefsReady = usePrefsHydrated();
  const onboardingDone = usePrefsStore((s) => s.onboardingDone);
  const remindersEnabled = usePrefsStore((s) => s.remindersEnabled);
  const reminderHour = usePrefsStore((s) => s.reminderHour);
  const language = usePrefsStore((s) => s.language);
  const { colors } = useTheme();
  useEffect(() => {
    if (prefsReady) SplashScreen.hideAsync().catch(() => {});
  }, [prefsReady]);

  // Keep the daily reminder in sync with settings and the UI language.
  useEffect(() => {
    if (session) syncDailyReminder(remindersEnabled, reminderHour).catch(() => {});
  }, [session, remindersEnabled, reminderHour, language]);

  if (!isSupabaseConfigured) return <SetupRequired />;
  if (!prefsReady) return null;

  // Onboarding needs no backend, so it shows while the anonymous user is created.
  const appReady = session !== null;
  if (onboardingDone && !appReady) {
    return (
      <Screen edges={['top', 'bottom']} contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        {status === 'error' ? <ErrorState message={t('error.startFailed')} onRetry={retry} /> : <LoadingState />}
      </Screen>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Protected guard={!onboardingDone}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={onboardingDone && appReady}>
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
        <AuthProvider enabled={isSupabaseConfigured}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
