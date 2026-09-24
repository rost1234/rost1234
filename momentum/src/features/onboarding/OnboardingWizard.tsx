import { useReducer, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { toErrorMessage } from '@/core/errors';
import { Banner, Button } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/components/theme';
import { requestNotificationPermission, scheduleReflectionReminder } from '@/services/notifications';
import { useSettingsStore } from '@/state/settingsStore';
import { GoalStep, NotificationStep, PresetStep } from './OnboardingSteps';
import { canAdvance, initialWizardState, selectedPresets, wizardReducer } from './wizardState';

export function OnboardingWizard() {
  const [state, dispatch] = useReducer(wizardReducer, initialWizardState);
  const [isSaving, setIsSaving] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);
  const presets = selectedPresets(state);

  const askPermission = async () => {
    setIsAsking(true);
    const status = await requestNotificationPermission();
    dispatch({ type: 'setNotificationStatus', status });
    if (status === 'granted') {
      const minutes = useSettingsStore.getState().settings?.reflectionReminderMinutes ?? 21 * 60;
      await scheduleReflectionReminder(Math.floor(minutes / 60), minutes % 60).catch(() => false);
    }
    setIsAsking(false);
  };

  const finish = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await completeOnboarding(presets.map((p) => p.habit));
      router.replace('/(tabs)');
    } catch (e) {
      setError(`Couldn't save your habits. ${toErrorMessage(e)}`);
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.progressRow}>
        {[1, 2, 3].map((n) => (
          <View key={n} style={[styles.dot, n <= state.step && styles.dotActive]} />
        ))}
        <Text style={[typography.caption, { marginLeft: 'auto' }]}>Step {state.step} of 3</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {error ? <Banner message={error} onDismiss={() => setError(null)} /> : null}
        {state.step === 1 ? (
          <GoalStep goal={state.goal} onSelect={(goal) => dispatch({ type: 'selectGoal', goal })} />
        ) : null}
        {state.step === 2 ? <PresetStep state={state} onToggle={(key) => dispatch({ type: 'togglePreset', key })} /> : null}
        {state.step === 3 ? <NotificationStep state={state} habitCount={presets.length} /> : null}
      </ScrollView>

      <View style={styles.footer}>
        {state.step > 1 ? (
          <Button label="Back" variant="ghost" onPress={() => dispatch({ type: 'back' })} disabled={isSaving} />
        ) : null}
        <View style={{ flex: 1 }} />
        {state.step < 3 ? (
          <Button label="Continue" onPress={() => dispatch({ type: 'next' })} disabled={!canAdvance(state)} />
        ) : state.notificationStatus === 'unknown' ? (
          <View style={styles.finalActions}>
            <Button label="Skip" variant="ghost" onPress={() => void finish()} disabled={isAsking} loading={isSaving} />
            <Button label="Allow notifications" onPress={() => void askPermission()} loading={isAsking} />
          </View>
        ) : (
          <Button label="Start Momentum" onPress={() => void finish()} loading={isSaving} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  dot: { width: 28, height: 6, borderRadius: radius.pill, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  finalActions: { flexDirection: 'row', gap: spacing.sm },
});
