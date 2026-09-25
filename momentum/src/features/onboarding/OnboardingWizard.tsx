import { useReducer, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { toErrorMessage } from '@/core/errors';
import { Banner, Button } from '@/components/ui';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { requestNotificationPermission } from '@/services/notifications';
import { useSettingsStore } from '@/state/settingsStore';
import { GoalStep, NotificationStep, PresetStep } from './OnboardingSteps';
import { canAdvance, initialWizardState, selectedPresets, wizardReducer } from './wizardState';
import { useT } from '@/i18n';
import { useBottomSpace } from '@/components/useBottomSpace';

export function OnboardingWizard() {
  const t = useT();
  const { typography } = useTheme();
  const styles = useStyles();
  const bottomSpace = useBottomSpace();
  const [state, dispatch] = useReducer(wizardReducer, initialWizardState);
  const [isSaving, setIsSaving] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);
  const presets = selectedPresets(state, t.language);

  const askPermission = async () => {
    setIsAsking(true);
    const status = await requestNotificationPermission();
    // The notification planner schedules the reflection reminder once Today loads.
    dispatch({ type: 'setNotificationStatus', status });
    setIsAsking(false);
  };

  const finish = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await completeOnboarding(presets.map((p) => p.habit), state.goal);
      router.replace('/(main)');
    } catch (e) {
      setError(t('onb.saveError', { error: toErrorMessage(e) }));
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.progressRow}>
        {[1, 2, 3].map((n) => (
          <View key={n} style={[styles.dot, n <= state.step && styles.dotActive]} />
        ))}
        <Text style={[typography.caption, { marginLeft: 'auto' }]}>{t('onb.stepOf', { step: state.step })}</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomSpace }]}>
        {error ? <Banner message={error} onDismiss={() => setError(null)} /> : null}
        {state.step === 1 ? (
          <GoalStep goal={state.goal} onSelect={(goal) => dispatch({ type: 'selectGoal', goal })} />
        ) : null}
        {state.step === 2 ? <PresetStep state={state} onToggle={(key) => dispatch({ type: 'togglePreset', key })} /> : null}
        {state.step === 3 ? <NotificationStep state={state} habitCount={presets.length} /> : null}
      </ScrollView>

      <View style={styles.footer}>
        {state.step > 1 ? (
          <Button label={t('common.back')} variant="ghost" onPress={() => dispatch({ type: 'back' })} disabled={isSaving} />
        ) : null}
        <View style={{ flex: 1 }} />
        {state.step < 3 ? (
          <Button label={t('onb.continue')} onPress={() => dispatch({ type: 'next' })} disabled={!canAdvance(state)} />
        ) : state.notificationStatus === 'unknown' ? (
          <View style={styles.finalActions}>
            <Button label={t('common.skip')} variant="ghost" onPress={() => void finish()} disabled={isAsking} loading={isSaving} />
            <Button label={t('onb.allowNotifications')} onPress={() => void askPermission()} loading={isAsking} />
          </View>
        ) : (
          <Button label={t('onb.start')} onPress={() => void finish()} loading={isSaving} />
        )}
      </View>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  safe: { flex: 1, backgroundColor: colors.background },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  dot: { width: 28, height: 6, borderRadius: radius.pill, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary },
  content: { padding: spacing.xl },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  finalActions: { flexDirection: 'row', gap: spacing.sm },
}));
