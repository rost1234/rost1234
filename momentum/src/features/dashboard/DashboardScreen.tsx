import { useCallback, useEffect, useMemo } from 'react';
import { AppState, Pressable, RefreshControl, ScrollView } from 'react-native';
import { Text } from '@/components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { runDetached } from '@/core/errors';
import { DashboardSkeleton } from '@/components/Skeleton';
import { Toast } from '@/components/Toast';
import { Banner, Button, SectionTitle } from '@/components/ui';
import { makeStyles, spacing, useTheme } from '@/components/theme';
import { dailyProgressPercent, progressOf } from '@/domain/habitProgress';
import { groupForHome, setAsideToday } from '@/domain/habitGroups';
import { habitsDueOn } from '@/domain/habitSchedule';
import { orderByTimeOfDay } from '@/domain/rhythm';
import { orderByStacking } from '@/domain/stacking';
import { GardenHeader } from '@/features/garden/GardenHeader';
import { Sprout } from '@/features/garden/Sprout';
import { useGardenGrowth } from '@/features/garden/useGarden';
import { InsightCard, useDailyInsight } from '@/features/insights/InsightCard';
import { LetterDueCard } from '@/features/letters/LetterDueCard';
import { shouldShowWeeklySummary } from '@/features/weekly/weeklyPrompt';
import { openEndedUrge, useUrgeStore } from '@/features/urge/urgeStore';
import { useDayOff } from '@/hooks/useDayOff';
import { useLocalDate } from '@/hooks/useLocalDate';
import { useNow } from '@/hooks/useNow';
import { useDayCloseStore } from '@/state/dayCloseStore';
import { useFocusStore } from '@/state/focusStore';
import { useHabitStore } from '@/state/habitStore';
import { useReflectionStore } from '@/state/reflectionStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useTaskStore } from '@/state/taskStore';
import { Celebration } from './Celebration';
import { AutomaticCard } from './AutomaticCard';
import { CoachMarks } from './CoachMarks';
import { DashboardHeader } from './DashboardHeader';
import { DecideCard } from './DecideCard';
import { WelcomeBackCard, useWelcomeBack } from './WelcomeBackCard';
import { FirstWinCard } from './FirstWinCard';
import { useHomePromptSlot } from './homePrompts';
import { YesterdayCard } from './YesterdayCard';
import { FoldedSection } from './FoldedSection';
import { EmptyHabits } from './EmptyHabits';
import { JustAddedCard } from './JustAddedCard';
import { HardDayBar } from './HardDayBar';
import { HomeTopBar } from './HomeChrome';
import { LevelCard } from './LevelCard';
import { HabitCard } from './HabitCard';
import { HabitGroupCard } from './HabitGroupCard';
import { MoreSection } from './MoreSection';
import { ReflectionPrompt } from './ReflectionPrompt';
import { TaskList } from './TaskList';
import { useT } from '@/i18n';
import { DOCK_CLEARANCE, useBottomSpace } from '@/components/useBottomSpace';

const EVENING_HOUR = 17;

function useDashboardData(today: string, hour: number) {
  const habits = useHabitStore((s) => s.habits);
  const logs = useHabitStore((s) => s.logs);
  // Stacked habits follow their anchor; the current part of the day comes first.
  const dueToday = useMemo(() => orderByTimeOfDay(orderByStacking(habitsDueOn(habits, today)), hour), [habits, today, hour]);
  const percent = useMemo(
    () => dailyProgressPercent(dueToday.map((habit) => ({ habit, progress: progressOf(logs[habit.id]?.[today]) }))),
    [dueToday, logs, today],
  );
  const doneCount = useMemo(
    () => dueToday.filter((habit) => progressOf(logs[habit.id]?.[today]).status === 'completed').length,
    [dueToday, logs, today],
  );
  // Skipped habits don't count toward "all done" (the ring ignores them too).
  const countedCount = useMemo(
    () => dueToday.filter((habit) => progressOf(logs[habit.id]?.[today]).status !== 'skipped').length,
    [dueToday, logs, today],
  );
  return { dueToday, percent, doneCount, countedCount, restCount: habits.length - dueToday.length };
}

export function DashboardScreen() {
  const t = useT();
  const styles = useStyles();
  const { look, scenery } = useTheme();
  const garden = look === 'garden';
  const sproutStage = useGardenGrowth().stage;
  // The toast's little sprout only cheers when the change marked a habit done.
  const lastWasDone = useHabitStore((s) => (s.lastChange && s.today ? s.logs[s.lastChange.habitId]?.[s.today]?.status === 'completed' : false));
  // The tab bar (and the focus timer button during a session) float at the bottom.
  const focusRunning = useFocusStore((s) => s.timer !== null);
  const bottomSpace = useBottomSpace(DOCK_CLEARANCE + (focusRunning ? 56 : 0));
  // Re-renders (and reloads) automatically when the local date rolls over.
  const today = useLocalDate();
  const status = useHabitStore((s) => s.status);
  const error = useHabitStore((s) => s.error);
  const forgivenDays = useHabitStore((s) => s.lastForgivenDays);
  const freezeAwarded = useHabitStore((s) => s.lastFreezeAwarded);
  const clearError = useHabitStore((s) => s.clearError);
  const lastChange = useHabitStore((s) => s.lastChange);
  const undoLast = useHabitStore((s) => s.undoLast);
  const dismissLastChange = useHabitStore((s) => s.dismissLastChange);
  const taskError = useTaskStore((s) => s.error);
  const clearTaskError = useTaskStore((s) => s.clearError);
  // The evening check-in only takes space on the main screen when it's relevant.
  const hour = useNow(true, 60_000).getHours();
  const isEvening = hour >= EVENING_HOUR;
  const freezes = useSettingsStore((s) => s.settings?.streakFreezesAvailable ?? 0);
  const reflection = useReflectionStore((s) => s.byDate[today]);
  const { dueToday, percent, doneCount, countedCount, restCount } = useDashboardData(today, hour);
  // One insight a day: a card, or in the Garden look the sprout tells it.
  const daily = useDailyInsight(today);
  // Skipped, "not today" and morning-only habits after the morning wait in a folded section.
  const logs = useHabitStore((s) => s.logs);
  const closedDate = useDayCloseStore((s) => s.date);
  const closedIds = useDayCloseStore((s) => s.ids);
  const { open: openHabits, aside } = useMemo(
    () => setAsideToday(dueToday, (id) => logs[id]?.[today]?.status, closedDate === today ? closedIds : [], hour),
    [dueToday, logs, today, closedDate, closedIds, hour],
  );
  const dayOff = useDayOff(today);
  const welcomeBack = useWelcomeBack(today);
  const showWelcomeBack = useHomePromptSlot('welcomeBack', welcomeBack.show);
  const openTasks = useTaskStore((s) => s.tasks.filter((task) => !task.isCompleted).length + s.overdue.length);
  const habits = useHabitStore((s) => s.habits);

  const reload = useCallback(() => {
    runDetached(useHabitStore.getState().load(today));
    runDetached(useTaskStore.getState().load(today));
    runDetached(useReflectionStore.getState().loadForDate(today));
  }, [today]);

  // Once a week, a 30-second look back at last week.
  useEffect(() => {
    if (status !== 'ready') return;
    shouldShowWeeklySummary(today, habits).then((show) => {
      if (show) router.push('/weekly');
    }, () => undefined);
  }, [status, today, habits]);

  useEffect(() => {
    reload();
    // An "urge now" timer that ended while we were away asks "did it pass?" once.
    const askEndedUrge = () =>
      runDetached(
        useUrgeStore
          .getState()
          .hydrate()
          .then(() => openEndedUrge(() => router.push('/urge'))),
      );
    askEndedUrge();
    // Habits may have been ticked from the home-screen widget while we were away.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      reload();
      askEndedUrge();
    });
    return () => subscription.remove();
  }, [reload]);

  if (status === 'idle' || status === 'loading') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <DashboardSkeleton />
      </SafeAreaView>
    );
  }

  const headerProps = {
    today,
    hour,
    percent,
    doneCount,
    totalCount: dueToday.length,
    freezes,
    dayOffLabel: dayOff?.label ?? null,
    dayOffName: dayOff?.name ?? null,
  };

  return (
    // In the Garden look the hill reaches up under the status bar.
    <SafeAreaView style={[styles.safe, garden && { backgroundColor: scenery.hill }]} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomSpace }]}
        refreshControl={<RefreshControl refreshing={false} onRefresh={reload} />}
        keyboardShouldPersistTaps="handled"
      >
        {garden ? (
          <GardenHeader {...headerProps} countedCount={countedCount} comeback={welcomeBack.show} tip={daily.insight} />
        ) : (
          <>
            <HomeTopBar />
            <DashboardHeader {...headerProps} />
          </>
        )}

        {showWelcomeBack ? <WelcomeBackCard onClose={welcomeBack.close} /> : null}
        <HardDayBar today={today} />
        <CoachMarks />
        <FirstWinCard today={today} hour={hour} />
        <YesterdayCard today={today} hour={hour} />
        <LetterDueCard today={today} />
        <LevelCard today={today} />
        <InsightCard daily={daily} hideInsight={garden} />
        <AutomaticCard today={today} />
        {error ? <Banner message={error} onDismiss={clearError} /> : null}
        {taskError ? <Banner message={taskError} onDismiss={clearTaskError} /> : null}
        {freezeAwarded ? <Banner tone="info" message={t('today.perfectWeek')} /> : null}
        {forgivenDays > 0 ? (
          <Banner
            tone="info"
            message={t.plural('today.freezeUsed', forgivenDays)}
          />
        ) : null}

        <SectionTitle
          action={
            <Pressable accessibilityRole="button" onPress={() => router.push('/habit/new')} hitSlop={8}>
              <Text style={styles.link}>{t('today.addHabit')}</Text>
            </Pressable>
          }
        >
          {t('today.habits')}
        </SectionTitle>

        {status === 'error' && dueToday.length === 0 ? (
          <Button label={t('common.retry')} variant="secondary" onPress={reload} />
        ) : dueToday.length === 0 ? (
          <EmptyHabits hasAnyHabits={restCount > 0} />
        ) : (
          <>
            {groupForHome(openHabits).map((item) =>
              item.kind === 'group' ? (
                <HabitGroupCard key={`group:${item.name}`} name={item.name} habits={item.habits} />
              ) : (
                <HabitCard key={item.habit.id} habit={item.habit} />
              ),
            )}
            <JustAddedCard />
            {aside.length > 0 ? (
              <FoldedSection icon="🌙" title={t('aside.title')} summary={t.plural('aside.summary', aside.length)} hint={t('aside.hint')}>
                {aside.map((habit) => (
                  <HabitCard key={habit.id} habit={habit} passed />
                ))}
              </FoldedSection>
            ) : null}
          </>
        )}

        {dayOff ? (
          <FoldedSection
            icon="📋"
            title={t('today.todays3')}
            summary={openTasks === 0 ? t('dayoff.noTasks') : t.plural('dayoff.openTasks', openTasks)}
          >
            {welcomeBack.show ? null : <DecideCard />}
            <TaskList />
          </FoldedSection>
        ) : (
          <>
            {welcomeBack.show ? null : <DecideCard />}
            <SectionTitle>{t('today.todays3')}</SectionTitle>
            <TaskList />
          </>
        )}

        {isEvening ? (
          <>
            <SectionTitle>{t('today.windDown')}</SectionTitle>
            <ReflectionPrompt reflection={reflection} />
          </>
        ) : null}

        <MoreSection unscheduledCount={restCount} reflection={reflection} showReflection={!isEvening} />
      </ScrollView>
      {lastChange ? (
        <Toast
          id={lastChange.at}
          message={lastChange.label}
          actionLabel={t('common.undo')}
          onAction={undoLast}
          onHide={dismissLastChange}
          // Above the tab bar, and above the focus timer button during a session.
          bottomOffset={DOCK_CLEARANCE + (focusRunning ? 60 : 0)}
          // Garden: the sprout cheers in the corner of the toast.
          leading={garden && lastWasDone ? <Sprout stage={sproutStage} mood="joy" size={34} /> : undefined}
        />
      ) : null}
      <Celebration />
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors, typography }) => ({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { backgroundColor: colors.background },
  content: { padding: spacing.lg },
  link: { ...typography.label, color: colors.primary },
}));
