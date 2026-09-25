import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { showConfirm } from '@/components/Overlay';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Banner } from '@/components/ui';
import { currentTheme, focusColors, radius, spacing } from '@/components/theme';
import { runDetached } from '@/core/errors';
import { computeSnapshot } from '@/domain/focusTimer';
import { CLASSIC_POMODORO } from '@/domain/pomodoro';
import { useNow } from '@/hooks/useNow';
import { useFocusStore, type FocusLink } from '@/state/focusStore';
import { useHabitStore } from '@/state/habitStore';
import { useTaskStore } from '@/state/taskStore';
import { CircularTimer } from './CircularTimer';
import { FocusButton, FocusChip, FocusLabel } from './focusUi';
import { LinkSelector } from './LinkSelector';
import { SoundPicker } from './SoundPicker';
import { useT } from '@/i18n';
import { useBottomSpace } from '@/components/useBottomSpace';

const DURATIONS = [15, 25, 45, 60] as const;

function useLinkLabel(link: FocusLink): { title: string | null; why: string | null } {
  const habit = useHabitStore((s) => (link.habitId ? s.habits.find((h) => h.id === link.habitId) : undefined));
  const task = useTaskStore((s) => (link.taskId ? s.tasks.find((t) => t.id === link.taskId) : undefined));
  return { title: habit?.title ?? task?.title ?? null, why: habit?.why ? habit.why : null };
}

function ActiveTimer() {
  const t = useT();
  const timer = useFocusStore((s) => s.timer);
  const { pause, resume, finish, cancel, onPhaseElapsed } = useFocusStore.getState();
  const now = useNow(timer !== null && timer.pausedAt === null);
  const { title: label, why } = useLinkLabel({ habitId: timer?.habitId ?? null, taskId: timer?.taskId ?? null });

  // Pure derivation from the persisted start time: correct after background/lock.
  const snapshot = timer ? computeSnapshot(timer, now) : null;

  useEffect(() => {
    if (snapshot?.isFinished) runDetached(onPhaseElapsed());
  }, [snapshot?.isFinished, onPhaseElapsed]);

  if (!timer || !snapshot) return null;

  const confirmCancel = () =>
    showConfirm({
      title: t('focus.cancelTitle'),
      message: t('focus.cancelBody'),
      cancelLabel: t('focus.keepGoing'),
      confirmLabel: t('focus.cancelSession'),
      destructive: true,
      icon: 'stop-circle-outline',
      onConfirm: () => runDetached(cancel()),
    });

  return (
    <View style={styles.active}>
      <View style={styles.focusPill}>
        <Text style={styles.focusPillText} numberOfLines={1}>
          {timer.pomodoro
            ? `${timer.pomodoro.phase === 'work' ? t('focus.phaseWork') : t('focus.phaseBreak')} ${timer.pomodoro.cycle}/${timer.pomodoro.totalCycles}${label ? ` · ${label}` : ''}`
            : label
              ? t('focus.focusingOn', { label })
              : t('focus.deep')}
        </Text>
      </View>
      {why ? <Text style={styles.why}>“{why}”</Text> : null}
      <CircularTimer
        remainingSeconds={snapshot.remainingSeconds}
        progress={snapshot.progress}
        isPaused={snapshot.isPaused}
        isBreak={timer.pomodoro?.phase === 'break'}
        caption={timer.pomodoro?.phase === 'break' ? t('focus.breakCaption') : undefined}
      />
      <View style={styles.controls}>
        {snapshot.isPaused ? (
          <FocusButton label={t('focus.resume')} icon="play" variant="primary" onPress={() => runDetached(resume())} style={styles.grow} />
        ) : (
          <FocusButton label={t('focus.pause')} icon="pause" onPress={() => runDetached(pause())} style={styles.grow} />
        )}
        <FocusButton label={t('focus.finish')} icon="checkmark" onPress={() => runDetached(finish())} style={styles.grow} />
      </View>
      <SoundPicker isPlaying={!snapshot.isPaused} />
      <FocusButton label={t('focus.cancelSession')} variant="ghost" onPress={confirmCancel} />
    </View>
  );
}

function TimerSetup({ initialHabitId }: { initialHabitId: string | null }) {
  const t = useT();
  const habits = useHabitStore((s) => s.habits);
  const tasks = useTaskStore((s) => s.tasks);
  const start = useFocusStore((s) => s.start);
  const lastSummary = useFocusStore((s) => s.lastSummary);
  const dismissSummary = useFocusStore((s) => s.dismissSummary);
  const [minutes, setMinutes] = useState<number>(25);
  const [pomodoro, setPomodoro] = useState(false);
  const [link, setLink] = useState<FocusLink>({ habitId: initialHabitId, taskId: null });

  return (
    <View style={styles.setup}>
      {lastSummary ? (
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>{lastSummary.minutes > 0 ? t('focus.logged') : t('focus.ended')}</Text>
          <Text style={styles.summaryText}>
            {lastSummary.minutes > 0
              ? lastSummary.blocks > 1
                ? t('focus.savedMinutesBlocks', { minutes: lastSummary.minutes, blocks: lastSummary.blocks })
                : t('focus.savedMinutes', { minutes: lastSummary.minutes })
              : t('focus.tooShort')}
          </Text>
          <FocusButton label={t('common.done')} onPress={dismissSummary} />
        </View>
      ) : null}

      <CircularTimer
        remainingSeconds={(pomodoro ? CLASSIC_POMODORO.workMinutes : minutes) * 60}
        progress={0}
        isPaused={false}
        caption={pomodoro ? t('focus.pomodoroCaption', { count: CLASSIC_POMODORO.totalCycles }) : t('focus.ready')}
        size={230}
      />

      <View style={styles.block}>
        <FocusLabel>{t('focus.mode')}</FocusLabel>
        <View style={styles.durations}>
          <FocusChip label={t('focus.single')} selected={!pomodoro} onPress={() => setPomodoro(false)} />
          <FocusChip
            label={t('focus.pomodoro', { work: CLASSIC_POMODORO.workMinutes, brk: CLASSIC_POMODORO.breakMinutes, cycles: CLASSIC_POMODORO.totalCycles })}
            selected={pomodoro}
            onPress={() => setPomodoro(true)}
          />
        </View>
      </View>

      {!pomodoro ? (
        <View style={styles.block}>
          <FocusLabel>{t('focus.duration')}</FocusLabel>
          <View style={styles.durations}>
            {DURATIONS.map((d) => (
              <FocusChip key={d} label={t('focus.minutes', { minutes: d })} selected={minutes === d} onPress={() => setMinutes(d)} />
            ))}
          </View>
        </View>
      ) : null}

      <LinkSelector habits={habits} tasks={tasks} value={link} onChange={setLink} />
      <SoundPicker isPlaying={false} />

      <FocusButton
        label={t('focus.start')}
        icon="play"
        variant="primary"
        onPress={() => runDetached(start(minutes, link, { pomodoro }))}
        style={styles.fullWidth}
      />
      <DndHint />
    </View>
  );
}

/** Android can't toggle Do Not Disturb without a special permission, so we open its settings. */
function DndHint() {
  const t = useT();
  if (Platform.OS !== 'android') return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('focus.dndA11y')}
      onPress={() => runDetached(Linking.sendIntent('android.settings.ZEN_MODE_SETTINGS'))}
      style={styles.dnd}
      hitSlop={8}
    >
      <Ionicons name="moon-outline" size={16} color={focusColors.textMuted} />
      <Text style={styles.dndText}>{t('focus.dnd')}</Text>
    </Pressable>
  );
}

export function FocusScreen() {
  const t = useT();
  const bottomSpace = useBottomSpace();
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
      return () => setStatusBarStyle(currentTheme().isDark ? 'light' : 'dark');
    }, []),
  );

  return (
    <LinearGradient colors={[focusColors.backgroundTop, focusColors.backgroundBottom]} style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomSpace }]}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, styles.grow]} accessibilityRole="header">
              {t('focus.title')}
            </Text>
            {/* Minimizing keeps the session running; the Home button shows the time left. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('focus.minimize')}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              hitSlop={10}
              style={styles.minimize}
            >
              <Ionicons name="chevron-down" size={22} color={focusColors.text} />
            </Pressable>
          </View>
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
  content: { padding: spacing.lg, gap: spacing.lg },
  title: { color: focusColors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  minimize: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: focusColors.surface,
  },
  active: { alignItems: 'center', gap: spacing.xl, marginTop: spacing.sm },
  focusPill: {
    maxWidth: '90%',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: focusColors.surface,
  },
  focusPillText: { color: focusColors.text, fontSize: 14, fontWeight: '600' },
  why: { color: focusColors.textMuted, fontSize: 14, fontStyle: 'italic', textAlign: 'center', marginTop: -spacing.md },
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
  dnd: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dndText: { color: focusColors.textMuted, fontSize: 13, textDecorationLine: 'underline' },
});
