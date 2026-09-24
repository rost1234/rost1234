import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { runDetached } from '@/core/errors';
import { DashboardSkeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui';
import { colors, spacing, typography } from '@/components/theme';
import { configureNotifications } from '@/services/notifications';
import { useFocusStore } from '@/state/focusStore';
import { useSettingsStore } from '@/state/settingsStore';

/** Route-level error boundary: catches render errors anywhere below the root. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.center}>
      <Text style={typography.heading}>Something went wrong</Text>
      <Text style={[typography.caption, styles.message]}>{error.message}</Text>
      <Button label="Try again" onPress={() => runDetached(retry())} />
    </View>
  );
}

function Bootstrap() {
  const status = useSettingsStore((s) => s.status);
  const error = useSettingsStore((s) => s.error);

  useEffect(() => {
    configureNotifications();
    runDetached(useSettingsStore.getState().load());
    runDetached(useFocusStore.getState().hydrate());
  }, []);

  if (status === 'error') {
    return (
      <View style={styles.center}>
        <Text style={typography.heading}>Couldn’t open your data</Text>
        <Text style={[typography.caption, styles.message]}>{error}</Text>
        <Button label="Retry" onPress={() => runDetached(useSettingsStore.getState().load())} />
      </View>
    );
  }

  if (status !== 'ready') {
    return (
      <View style={styles.loading}>
        <DashboardSkeleton />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="reflection"
        options={{ presentation: 'modal', headerShown: true, title: 'Daily reflection' }}
      />
      <Stack.Screen name="habit/new" options={{ presentation: 'modal', headerShown: true, title: 'New habit' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Bootstrap />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
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
});
