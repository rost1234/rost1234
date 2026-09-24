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
import { useNow } from '@/hooks/useNow';
import { useHabitStore } from '@/state/habitStore';
import { useReflectionStore } from '@/state/reflectionStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useTaskStore } from '@/state/taskStore';
import { DashboardHeader } from './DashboardHeader';
import { DecideCard } from './DecideCard';
import { HabitCard } from './HabitCard';
import { MoreSection } from './MoreSection';
import { ReflectionPrompt } from './ReflectionPrompt';
import { TaskList } from './TaskList';

const EVENING_HOUR = 17;

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
  const freezeAwarded = useHabitStore((s) => s.lastFreezeAwarded);
  const clearError = useHabitStore((s) => s.clearError);
  const taskError = useTaskStore((s) => s.error);
  const clearTaskError = useTaskStore((s) => s.clearError);
  // The evening check-in only takes space on the main screen when it's relevant.
  const isEvening = useNow(true, 60_000).getHours() >= EVENING_HOUR;
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
        {taskError ? <Banner message={taskError} onDismiss={clearTaskError} /> : null}
        {freezeAwarded ? <Banner tone="info" message="🧊 Perfect week! You earned a streak freeze." /> : null}
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

        <DecideCard />

        <SectionTitle>Today’s 3</SectionTitle>
        <TaskList />

        {isEvening ? (
          <>
            <SectionTitle>Wind down</SectionTitle>
            <ReflectionPrompt reflection={reflection} />
          </>
        ) : null}

        <MoreSection unscheduledCount={restCount} reflection={reflection} showReflection={!isEvening} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  link: { ...typography.label, color: colors.primary },
  empty: { gap: spacing.md, alignItems: 'flex-start' },
});
