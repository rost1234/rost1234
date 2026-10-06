import { memo, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { showActionSheet, type SheetAction } from '@/components/Overlay';
import { ProgressBar } from '@/components/ui';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { haptics } from '@/core/haptics';
import { formatShortDate } from '@/core/localDate';
import { completionRatio, progressOf } from '@/domain/habitProgress';
import type { Habit } from '@/domain/models';
import { consistency, showConsistency } from '@/domain/motivation';
import { isPaused } from '@/domain/pauses';
import { hasCompletionBefore } from '@/domain/streaks';
import { quitSavings } from '@/domain/urges';
import { quitPlanText, savingsText } from '@/features/urge/quitText';
import { useUrgeStore } from '@/features/urge/urgeStore';
import { useHabitStore } from '@/state/habitStore';
import { usePlanningStore } from '@/state/planningStore';
import { currentLanguage, t, tPlural, useT } from '@/i18n';

interface HabitCardProps {
  habit: Habit;
}

function openHabitMenu(habit: Habit, isSkipped: boolean) {
  const { skipHabit, archiveHabit, undoHabitStep, completedBefore, today, logs } = useHabitStore.getState();
  const choices = (completedBefore[habit.id] ?? 0) + (today && logs[habit.id]?.[today]?.status === 'completed' ? 1 : 0);
  const actions: SheetAction[] = [
    isSkipped
      ? { label: t('habit.unskipToday'), icon: 'arrow-undo-outline', run: () => skipHabit(habit.id) }
      : { label: t('habit.skipToday'), icon: 'play-skip-forward-outline', run: () => skipHabit(habit.id) },
    { label: t('habit.edit'), icon: 'create-outline', run: () => router.push({ pathname: '/habit/[id]', params: { id: habit.id } }) },
    { label: t('habit.resetToday'), icon: 'refresh-outline', run: () => undoHabitStep(habit.id) },
    { label: t('habit.pause'), icon: 'pause-circle-outline', run: () => router.push({ pathname: '/streaks', params: { habitId: habit.id } }) },
    { label: t('habit.archive'), icon: 'archive-outline', destructive: true, run: () => void archiveHabit(habit.id) },
  ];
  const message = [habit.why ? t('habit.why', { why: habit.why }) : null, choices > 0 ? tPlural(currentLanguage(), 'path.sofar', choices) : null].filter(Boolean).join('\n');
  showActionSheet({ title: habit.title, message: message || undefined, actions });
}

/** Opens "urge now"; an old ended timer for another habit is dropped first. */
function openUrge(habitId: string) {
  const { session, clear } = useUrgeStore.getState();
  if (session && session.habitId !== habitId && Date.now() >= session.endsAt) clear();
  router.push({ pathname: '/urge', params: { habitId } });
}

/** Springs the check circle whenever the habit becomes done. */
function useDonePop(isDone: boolean): Animated.Value {
  const [scale] = useState(() => new Animated.Value(1));
  const wasDone = useRef(isDone);
  useEffect(() => {
    if (isDone && !wasDone.current) {
      scale.setValue(0.6);
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }).start();
    }
    wasDone.current = isDone;
  }, [isDone, scale]);
  return scale;
}

function HabitCardComponent({ habit }: HabitCardProps) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  // Each card subscribes only to its own slice, so a tap re-renders one card.
  const log = useHabitStore((s) => (s.today ? s.logs[habit.id]?.[s.today] : undefined));
  const streak = useHabitStore((s) => s.streaks[habit.id] ?? 0);
  const anchorTitle = useHabitStore((s) => (habit.afterHabitId ? s.habits.find((h) => h.id === habit.afterHabitId)?.title : undefined));
  // "Fresh start" instead of a bare zero when the user is coming back after a break.
  const isComeback = useHabitStore((s) => {
    const byDate = s.logs[habit.id];
    if (!s.today || !byDate || (s.streaks[habit.id] ?? 0) > 0) return false;
    return hasCompletionBefore(new Map(Object.entries(byDate).map(([d, l]) => [d, l.status])), s.today);
  });
  // After a break, the whole month ("26 of 30") beside the young streak, so one miss doesn't erase the rest.
  const pauses = usePlanningStore((s) => s.pauses);
  const consistencyText = useHabitStore((s) => {
    const byDate = s.logs[habit.id];
    if (!s.today || !byDate) return null;
    const statuses = new Map(Object.entries(byDate).map(([d, l]) => [d, l.status]));
    const result = consistency(habit, statuses, s.today, (date) => isPaused(pauses, date, habit.id));
    return showConsistency(s.streaks[habit.id] ?? 0, result) ? `${result.done}/${result.due}` : null;
  });
  // A pause for just this habit (app-wide pauses have their own banner).
  const pausedUntil = usePlanningStore((s) => {
    const today = s.today;
    if (!today) return undefined;
    return s.pauses.find((p) => p.habitId === habit.id && p.startDate <= today && p.endDate >= today)?.endDate;
  });
  const tapHabit = useHabitStore((s) => s.tapHabit);
  const undoHabitStep = useHabitStore((s) => s.undoHabitStep);

  const progress = progressOf(log);
  const ratio = completionRatio(habit, progress);
  const isDone = progress.status === 'completed';
  const isSkipped = progress.status === 'skipped';
  const pop = useDonePop(isDone);
  // Quit habits: what the clean days saved, by the user's own per-day estimate.
  const cleanDays = useHabitStore((s) => (habit.isQuit ? (s.completedBefore[habit.id] ?? 0) : 0)) + (habit.isQuit && isDone ? 1 : 0);
  const savings = habit.isQuit ? quitSavings(cleanDays, habit.quitCost, habit.quitMinutes) : null;
  const countLabel = habit.isQuantitative
    ? `${progress.currentCount}/${habit.targetCount}${habit.unit ? ` ${habit.unit}` : ''}`
    : isDone
      ? habit.isQuit
        ? t('habit.quitDone')
        : t('habit.done')
      : habit.isQuit
        ? t('habit.quitTap')
        : t('habit.tapToComplete');

  const onTap = () => {
    const willComplete = habit.isQuantitative ? progress.currentCount + 1 >= habit.targetCount && !isDone : !isDone;
    if (willComplete) haptics.success();
    else haptics.tap();
    tapHabit(habit.id);
  };

  return (
    <View style={[styles.card, isDone && styles.cardDone, isSkipped && styles.cardSkipped]}>
      <View style={styles.row}>
      <Pressable
        onPress={onTap}
        onLongPress={() => {
          haptics.select();
          openHabitMenu(habit, isSkipped);
        }}
        delayLongPress={350}
        accessibilityRole={habit.isQuantitative ? 'adjustable' : 'checkbox'}
        accessibilityState={habit.isQuantitative ? undefined : { checked: isDone }}
        accessibilityLabel={`${habit.title}, ${countLabel}${
          pausedUntil ? `, ${t('habit.pausedA11y', { date: formatShortDate(pausedUntil) })}` : streak > 0 ? t('habit.streakA11y', { count: streak }) : ''
        }`}
        accessibilityHint={habit.isQuantitative ? t('habit.hintCount') : t('habit.hintBinary')}
        style={({ pressed }) => [styles.main, pressed && { opacity: 0.75 }]}
      >
        <Animated.View style={[styles.checkCircle, isDone && styles.checkCircleDone, { transform: [{ scale: pop }] }]}>
          {isDone ? (
            <Ionicons name={habit.isQuit ? 'shield-checkmark' : 'checkmark'} size={22} color={colors.onPrimary} />
          ) : habit.isQuantitative ? (
            <Ionicons name="add" size={22} color={colors.primary} />
          ) : null}
        </Animated.View>
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={[typography.label, styles.title, isSkipped && styles.strike]} numberOfLines={1}>
              {habit.title}
            </Text>
            {pausedUntil && !isDone ? (
              <View style={[styles.streak, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="pause" size={11} color={colors.primary} />
                <Text style={[styles.streakText, { color: colors.primary }]}>{t('habit.pausedUntil', { date: formatShortDate(pausedUntil) })}</Text>
              </View>
            ) : streak > 0 ? (
              <View style={styles.streak}>
                <Ionicons name="flame" size={12} color={colors.warning} />
                <Text style={styles.streakText}>{streak}</Text>
              </View>
            ) : isComeback && !isDone ? (
              <View style={[styles.streak, styles.comeback]}>
                <Ionicons name="leaf" size={12} color={colors.success} />
                <Text style={[styles.streakText, { color: colors.success }]}>{t('habit.freshStart')}</Text>
              </View>
            ) : null}
            {consistencyText && !pausedUntil ? (
              <Text
                style={[styles.streakText, { color: colors.success }]}
                accessibilityLabel={t('habit.consistencyA11y', { done: consistencyText.split('/')[0] ?? '', due: consistencyText.split('/')[1] ?? '' })}
              >
                {t('habit.consistency', { value: consistencyText })}
              </Text>
            ) : null}
          </View>
          <Text style={typography.caption} numberOfLines={1}>
            {isSkipped
              ? t('habit.skipped')
              : habit.isQuit
                ? habit.cue && habit.microStep
                  ? quitPlanText(habit, t)
                  : habit.microStep
                    ? t('habit.instead', { step: habit.microStep })
                    : countLabel
              : anchorTitle
                ? `${t('habit.after', { anchor: anchorTitle })}${habit.microStep ? ` · ${habit.microStep}` : ''}`
                : habit.cue
                  ? `${habit.cue}${habit.microStep ? ` · ${habit.microStep}` : ''}`
                  : habit.microStep
                    ? habit.microStep
                    : countLabel}
          </Text>
          {savings ? (
            <View style={styles.savingsRow} accessible accessibilityLabel={t('quit.saved', { amount: savingsText(savings, t) })}>
              <Ionicons name="leaf-outline" size={13} color={colors.success} />
              <Text style={styles.savings} numberOfLines={1}>
                {t('quit.saved', { amount: savingsText(savings, t) })}
              </Text>
            </View>
          ) : null}
          {habit.isQuantitative ? (
            <View style={styles.progressRow}>
              <View style={{ flex: 1 }}>
                <ProgressBar value={ratio} color={isDone ? colors.success : colors.primary} height={6} />
              </View>
              <Text style={styles.count}>{countLabel}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>

      <View style={styles.actions}>
        {habit.isQuantitative && progress.currentCount > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('habit.undoOne', { unit: habit.unit || t('habit.step'), title: habit.title })}
            hitSlop={8}
            onPress={() => {
              haptics.tap();
              undoHabitStep(habit.id);
            }}
            style={styles.iconButton}
          >
            <Ionicons name="remove" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
        {habit.isQuit ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('habit.startFocus', { title: habit.title })}
            hitSlop={8}
            onPress={() => router.push({ pathname: '/focus', params: { habitId: habit.id } })}
            style={[styles.iconButton, styles.focusButton]}
          >
            <Ionicons name="play" size={16} color={colors.primary} />
          </Pressable>
        )}
      </View>
      </View>
      {habit.isQuit && !isSkipped ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('urge.openA11y', { title: habit.title })}
          onPress={() => {
            haptics.tap();
            openUrge(habit.id);
          }}
          style={({ pressed }) => [styles.urgeButton, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="water-outline" size={18} color={colors.primary} />
          <Text style={styles.urgeLabel}>{t('urge.open')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export const HabitCard = memo(HabitCardComponent);

const useStyles = makeStyles(({ colors, typography, shadow }) => ({
  card: {
    gap: spacing.sm + 2,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.md + 2,
    marginBottom: spacing.sm + 2,
    ...shadow,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  savingsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  savings: { fontSize: 13, fontWeight: '600', color: colors.text, flexShrink: 1 },
  urgeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  urgeLabel: { fontSize: 15, fontWeight: '700', color: colors.primary },
  cardDone: { backgroundColor: '#F2FBF5' },
  cardSkipped: { opacity: 0.55 },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  checkCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  checkCircleDone: { backgroundColor: colors.success, borderColor: colors.success },
  body: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flexShrink: 1, fontSize: 16 },
  strike: { textDecorationLine: 'line-through' },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
    backgroundColor: colors.warningSoft,
  },
  streakText: { fontSize: 12, fontWeight: '700', color: colors.warning },
  comeback: { backgroundColor: colors.successSoft },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  count: { ...typography.caption, fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginLeft: spacing.sm },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusButton: { backgroundColor: colors.primarySoft },
}));
