import { useEffect } from 'react';
import { AppState, I18nManager, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { runDetached } from '@/core/errors';
import { OverlayHost } from '@/components/Overlay';
import { DashboardSkeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui';
import { makeStyles, spacing, useTheme } from '@/components/theme';
import { configureNotifications } from '@/services/notifications';
import { startUsageTracking } from '@/services/usageTracker';
import { registerReminderCategory } from '@/services/habitReminders';
import { registerQuickActions } from '@/services/quickActions';
import { runAutoBackupIfDue } from '@/services/backup';
import { useDevicePrefsStore } from '@/state/devicePrefsStore';
import { startNotificationResponses } from '@/services/notificationResponses';
import { startNotificationPlanner } from '@/services/notificationPlanner';
import { startHabitEffects } from '@/state/habitEffects';
import { useFocusSoundStore } from '@/state/focusSoundStore';
import { useFocusStore } from '@/state/focusStore';
import { useHighlightStore } from '@/state/highlightStore';
import { usePrefsStore } from '@/state/prefsStore';
import { useSettingsStore } from '@/state/settingsStore';
import { resolveLanguage , useT } from '@/i18n';

/** Route-level error boundary: catches render errors anywhere below the root. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const t = useT();
  const { typography } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.center}>
      <Text style={typography.heading}>{t('root.errorTitle')}</Text>
      <Text style={[typography.caption, styles.message]}>{error.message}</Text>
      <Button label={t('root.tryAgain')} onPress={() => runDetached(retry())} />
    </View>
  );
}

function Bootstrap() {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const status = useSettingsStore((s) => s.status);
  const prefsReady = usePrefsStore((s) => s.isHydrated);
  const error = useSettingsStore((s) => s.error);

  useEffect(() => {
    runDetached(
      usePrefsStore
        .getState()
        .hydrate()
        .then(() => {
          // Hebrew is right-to-left. Android applies a direction change on the next launch.
          const wantRTL = resolveLanguage(usePrefsStore.getState().language) === 'he';
          I18nManager.allowRTL(true);
          if (I18nManager.isRTL !== wantRTL) I18nManager.forceRTL(wantRTL);
          // Button titles are translated, so register them once the language is known.
          runDetached(registerQuickActions());
          return registerReminderCategory();
        }),
    );
    startHabitEffects();
    const stopResponses = startNotificationResponses();
    const stopPlanner = startNotificationPlanner();
    configureNotifications();
    startUsageTracking();
    runDetached(useSettingsStore.getState().load());
    runDetached(useFocusSoundStore.getState().hydrate());
    runDetached(useFocusStore.getState().hydrate());
    runDetached(useHighlightStore.getState().hydrate());
    // Weekly backup to the user's folder, if they set one up.
    runDetached(useDevicePrefsStore.getState().hydrate().then(runAutoBackupIfDue));
    // A session may have been started from the Focus widget while we were away.
    const appState = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      runDetached(useFocusStore.getState().syncFromStorage());
      runDetached(runAutoBackupIfDue());
    });
    return () => {
      stopResponses();
      stopPlanner();
      appState.remove();
    };
  }, []);

  if (status === 'error') {
    return (
      <View style={styles.center}>
        <Text style={typography.heading}>{t('root.dbError')}</Text>
        <Text style={[typography.caption, styles.message]}>{error}</Text>
        <Button label={t('common.retry')} onPress={() => runDetached(useSettingsStore.getState().load())} />
      </View>
    );
  }

  if (status !== 'ready' || !prefsReady) {
    return (
      <View style={styles.loading}>
        <DashboardSkeleton />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      <Stack.Screen name="(main)" />
      <Stack.Screen
        name="reflection"
        options={{ presentation: 'modal', headerShown: true, title: t('nav.reflection') }}
      />
      <Stack.Screen name="habit/new" options={{ presentation: 'modal', headerShown: true, title: t('nav.newHabit') }} />
      <Stack.Screen name="habit/[id]" options={{ presentation: 'modal', headerShown: true, title: t('nav.editHabit') }} />
      <Stack.Screen name="review" options={{ presentation: 'modal', headerShown: true, title: t('nav.unfinished') }} />
      <Stack.Screen name="task-new" options={{ presentation: 'modal', headerShown: true, title: t('quick.addTask') }} />
      <Stack.Screen name="weekly" options={{ presentation: 'modal', headerShown: true, title: t('weekly.nav') }} />
    </Stack>
  );
}

export default function RootLayout() {
  const { isDark } = useTheme();
  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Bootstrap />
      <OverlayHost />
    </SafeAreaProvider>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  message: { textAlign: 'center' },
  loading: { flex: 1, paddingTop: 64, backgroundColor: colors.background },
}));
