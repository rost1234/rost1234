import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Banner } from '@/components/ui';
import { focusColors, radius, spacing } from '@/components/theme';
import { runDetached } from '@/core/errors';
import { computeSnapshot } from '@/domain/focusTimer';
import { useNow } from '@/hooks/useNow';
import { useFocusStore, type FocusLink } from '@/state/focusStore';
import { useHabitStore } from '@/state/habitStore';
import { useTaskStore } from '@/state/taskStore';
import { CircularTimer } from './CircularTimer';
import { FocusButton, FocusChip, FocusLabel } from './focusUi';
import { LinkSelector } from './LinkSelector';
import { SoundPicker } from './SoundPicker';

const DURATIONS = [15, 25, 45, 60] as const;

function useLinkLabel(link: FocusLink): string | null {
  const habit = useHabitStore((s) => (link.habitId ? s.habits.find((h) => h.id === link.habitId) : undefined));
  const task = useTaskStore((s) => (link.taskId ? s.tasks.find((t) => t.id === link.taskId) : undefined));
  return habit?.title ?? task?.title ?? null;
}

function ActiveTimer() {
  const timer = useFocusStore((s) => s.timer);
  const { pause, resume, finish, cancel } = useFocusStore.getState();
  const now = useNow(timer !== null && timer.pausedAt === null);
  const label = useLinkLabel({ habitId: timer?.habitId ?? null, taskId: timer?.taskId ?? null });

  // Pure derivation from the persisted start time: correct after background/lock.
  const snapshot = timer ? computeSnapshot(timer, now) : null;

  useEffect(() => {
    if (snapshot?.isFinished) runDetached(finish());
  }, [snapshot?.isFinished, finish]);

  if (!timer || !snapshot) return null;

  const confirmCancel = () =>
    Alert.alert('Cancel session?', 'This session will not be logged.', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Cancel session', style: 'destructive', onPress: () => runDetached(cancel()) },
    ]);

  return (
    <View style={styles.active}>
      <View style={styles.focusPill}>
        <Text style={styles.focusPillText} numberOfLines={1}>
          {label ? `Focusing on ${label}` : 'Deep focus'}
        </Text>
      </View>
      <CircularTimer remainingSeconds={snapshot.remainingSeconds} progress={snapshot.progress} isPaused={snapshot.isPaused} />
      <View style={styles.controls}>
        {snapshot.isPaused ? (
          <FocusButton label="Resume" icon="play" variant="primary" onPress={() => runDetached(resume())} style={styles.grow} />
        ) : (
          <FocusButton label="Pause" icon="pause" onPress={() => runDetached(pause())} style={styles.grow} />
        )}
        <FocusButton label="Finish" icon="checkmark" onPress={() => runDetached(finish())} style={styles.grow} />
      </View>
      <SoundPicker isPlaying={!snapshot.isPaused} />
      <FocusButton label="Cancel session" variant="ghost" onPress={confirmCancel} />
    </View>
  );
}

function TimerSetup({ initialHabitId }: { initialHabitId: string | null }) {
  const habits = useHabitStore((s) => s.habits);
  const tasks = useTaskStore((s) => s.tasks);
  const start = useFocusStore((s) => s.start);
  const lastSession = useFocusStore((s) => s.lastSession);
  const dismissSummary = useFocusStore((s) => s.dismissSummary);
  const [minutes, setMinutes] = useState<number>(25);
  const [link, setLink] = useState<FocusLink>({ habitId: initialHabitId, taskId: null });

  return (
    <View style={styles.setup}>
      {lastSession ? (
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Session logged 🎉</Text>
          <Text style={styles.summaryText}>{lastSession.durationMinutes} minutes of focus saved.</Text>
          <FocusButton label="Done" onPress={dismissSummary} />
        </View>
      ) : null}

      <CircularTimer remainingSeconds={minutes * 60} progress={0} isPaused={false} caption="Ready" size={230} />

      <View style={styles.block}>
        <FocusLabel>Duration</FocusLabel>
        <View style={styles.durations}>
          {DURATIONS.map((d) => (
            <FocusChip key={d} label={`${d} min`} selected={minutes === d} onPress={() => setMinutes(d)} />
          ))}
        </View>
      </View>

      <LinkSelector habits={habits} tasks={tasks} value={link} onChange={setLink} />
      <SoundPicker isPlaying={false} />

      <FocusButton
        label="Start focus"
        icon="play"
        variant="primary"
        onPress={() => runDetached(start(minutes, link))}
        style={styles.fullWidth}
      />
    </View>
  );
}

export function FocusScreen() {
  // Deep link from a habit card's "Start Focus" button; keyed so a new habit re-seeds the form.
  const params = useLocalSearchParams<{ habitId?: string }>();
  const initialHabitId = params.habitId ?? null;
  const timer = useFocusStore((s) => s.timer);
  const isHydrated = useFocusStore((s) => s.isHydrated);
  const error = useFocusStore((s) => s.error);

  // Light status bar on the dark focus screen only.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );

  return (
    <LinearGradient colors={[focusColors.backgroundTop, focusColors.backgroundBottom]} style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title} accessibilityRole="header">
            Focus
          </Text>
          {error ? <Banner message={error} onDismiss={() => useFocusStore.setState({ error: null })} /> : null}
          {!isHydrated ? null : timer ? (
            <ActiveTimer />
          ) : (
            <TimerSetup key={initialHabitId ?? 'none'} initialHabitId={initialHabitId} />
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  title: { color: focusColors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.3 },
  active: { alignItems: 'center', gap: spacing.xl, marginTop: spacing.sm },
  focusPill: {
    maxWidth: '90%',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: focusColors.surface,
  },
  focusPillText: { color: focusColors.text, fontSize: 14, fontWeight: '600' },
  controls: { flexDirection: 'row', gap: spacing.md, alignSelf: 'stretch' },
  grow: { flex: 1 },
  setup: { alignItems: 'center', gap: spacing.xl },
  block: { gap: spacing.sm, alignSelf: 'stretch' },
  durations: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  summary: {
    alignSelf: 'stretch',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: focusColors.surfaceActive,
  },
  summaryTitle: { color: focusColors.text, fontSize: 18, fontWeight: '700' },
  summaryText: { color: focusColors.textMuted, fontSize: 15 },
  fullWidth: { alignSelf: 'stretch' },
});
