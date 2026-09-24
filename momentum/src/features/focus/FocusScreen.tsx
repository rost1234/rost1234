import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { runDetached } from '@/core/errors';
import { Banner, Button, Card, Chip } from '@/components/ui';
import { colors, spacing, typography } from '@/components/theme';
import { computeSnapshot } from '@/domain/focusTimer';
import { useNow } from '@/hooks/useNow';
import { useFocusStore, type FocusLink } from '@/state/focusStore';
import { useHabitStore } from '@/state/habitStore';
import { useTaskStore } from '@/state/taskStore';
import { CircularTimer } from './CircularTimer';
import { LinkSelector } from './LinkSelector';

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
      <Text style={typography.caption}>{label ? `Focusing on ${label}` : 'Deep focus'}</Text>
      <CircularTimer remainingSeconds={snapshot.remainingSeconds} progress={snapshot.progress} isPaused={snapshot.isPaused} />
      <View style={styles.controls}>
        {snapshot.isPaused ? (
          <Button label="▶ Resume" onPress={() => runDetached(resume())} style={styles.grow} />
        ) : (
          <Button label="❚❚ Pause" variant="secondary" onPress={() => runDetached(pause())} style={styles.grow} />
        )}
        <Button label="✓ Finish" onPress={() => runDetached(finish())} style={styles.grow} />
      </View>
      <Button label="Cancel" variant="ghost" onPress={confirmCancel} />
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
        <Card style={styles.summary}>
          <Text style={typography.heading}>Session logged 🎉</Text>
          <Text style={typography.body}>{lastSession.durationMinutes} minutes of focus saved.</Text>
          <Button label="Done" variant="secondary" onPress={dismissSummary} />
        </Card>
      ) : null}

      <CircularTimer remainingSeconds={minutes * 60} progress={0} isPaused={false} size={220} />

      <View style={styles.durations}>
        {DURATIONS.map((d) => (
          <Chip key={d} label={`${d} min`} selected={minutes === d} onPress={() => setMinutes(d)} />
        ))}
      </View>

      <LinkSelector habits={habits} tasks={tasks} value={link} onChange={setLink} />

      <Button label="Start focus" onPress={() => runDetached(start(minutes, link))} style={styles.fullWidth} />
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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={typography.title} accessibilityRole="header">
          Focus
        </Text>
        {error ? <Banner message={error} onDismiss={() => useFocusStore.setState({ error: null })} /> : null}
        {!isHydrated ? null : timer ? <ActiveTimer /> : <TimerSetup key={initialHabitId ?? 'none'} initialHabitId={initialHabitId} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  active: { alignItems: 'center', gap: spacing.xl, marginTop: spacing.lg },
  controls: { flexDirection: 'row', gap: spacing.md, alignSelf: 'stretch' },
  grow: { flex: 1 },
  setup: { alignItems: 'center', gap: spacing.xl },
  durations: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  summary: { alignSelf: 'stretch', gap: spacing.sm },
  fullWidth: { alignSelf: 'stretch' },
});
