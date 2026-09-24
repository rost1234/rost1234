import { useCallback, useEffect, useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { runDetached } from '@/core/errors';
import { DashboardSkeleton } from '@/components/Skeleton';
import { Banner, Button, SectionTitle } from '@/components/ui';
import { colors, spacing, typography } from '@/components/theme';
import { dailyProgressPercent, progressOf } from '@/domain/habitProgress';
import { habitsDueOn } from '@/domain/habitSchedule';
import { useLocalDate } from '@/hooks/useLocalDate';
import { useHabitStore } from '@/state/habitStore';
import { useReflectionStore } from '@/state/reflectionStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useTaskStore } from '@/state/taskStore';
import { DashboardHeader } from './DashboardHeader';
import { HabitCard } from './HabitCard';
import { ReflectionPrompt } from './ReflectionPrompt';
import { TaskList } from './TaskList';

function useDashboardData(today: string) {
  const habits = useHabitStore((s) => s.habits);
  const logs = useHabitStore((s) => s.logs);
  const dueToday = useMemo(() => habitsDueOn(habits, today), [habits, today]);
  const percent = useMemo(
    () => dailyProgressPercent(dueToday.map((habit) => ({ habit, progress: progressOf(logs[habit.id]?.[today]) }))),
    [dueToday, logs, today],
  );
  return { dueToday, percent, restCount: habits.length - dueToday.length };
}

export function DashboardScreen() {
  // Re-renders (and reloads) automatically when the local date rolls over.
  const today = useLocalDate();
  const status = useHabitStore((s) => s.status);
  const error = useHabitStore((s) => s.error);
  const forgivenDays = useHabitStore((s) => s.lastForgivenDays);
  const clearError = useHabitStore((s) => s.clearError);
  const taskError = useTaskStore((s) => s.error);
  const freezes = useSettingsStore((s) => s.settings?.streakFreezesAvailable ?? 0);
  const reflection = useReflectionStore((s) => s.byDate[today]);
  const { dueToday, percent, restCount } = useDashboardData(today);

  const reload = useCallback(() => {
    runDetached(useHabitStore.getState().load(today));
    runDetached(useTaskStore.getState().load(today));
    runDetached(useReflectionStore.getState().loadForDate(today));
  }, [today]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (status === 'idle' || status === 'loading') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <DashboardSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={false} onRefresh={reload} />}
        keyboardShouldPersistTaps="handled"
      >
        <DashboardHeader today={today} percent={percent} freezes={freezes} />

        {error ? <Banner message={error} onDismiss={clearError} /> : null}
        {taskError ? <Banner message={taskError} /> : null}
        {forgivenDays > 0 ? (
          <Banner
            tone="info"
            message={`🧊 Streak freeze used for ${forgivenDays} missed day${forgivenDays === 1 ? '' : 's'} — your streaks are safe.`}
          />
        ) : null}

        <SectionTitle
          action={
            <Pressable accessibilityRole="button" onPress={() => router.push('/habit/new')} hitSlop={8}>
              <Text style={styles.link}>＋ Habit</Text>
            </Pressable>
          }
        >
          Habits
        </SectionTitle>

        {status === 'error' && dueToday.length === 0 ? (
          <Button label="Retry" variant="secondary" onPress={reload} />
        ) : dueToday.length === 0 ? (
          <View style={styles.empty}>
            <Text style={typography.body}>Nothing scheduled today.</Text>
            <Button label="Add a habit" variant="secondary" onPress={() => router.push('/habit/new')} />
          </View>
        ) : (
          dueToday.map((habit) => <HabitCard key={habit.id} habit={habit} />)
        )}
        {restCount > 0 ? (
          <Text style={[typography.caption, styles.rest]}>
            {restCount} habit{restCount === 1 ? '' : 's'} not scheduled today
          </Text>
        ) : null}

        <SectionTitle>Tasks</SectionTitle>
        <TaskList />

        <SectionTitle>Wind down</SectionTitle>
        <ReflectionPrompt reflection={reflection} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  link: { ...typography.label, color: colors.primary },
  empty: { gap: spacing.md, alignItems: 'flex-start' },
  rest: { marginTop: spacing.xs },
});
