import { memo, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { showActionSheet, type SheetAction } from '@/components/Overlay';
import { ProgressBar } from '@/components/ui';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { haptics } from '@/core/haptics';
import { completionRatio, progressOf } from '@/domain/habitProgress';
import type { Habit } from '@/domain/models';
import { hasCompletionBefore } from '@/domain/streaks';
import { useHabitStore } from '@/state/habitStore';
import { t, useT } from '@/i18n';

interface HabitCardProps {
  habit: Habit;
}

function openHabitMenu(habit: Habit, isSkipped: boolean) {
  const { skipHabit, archiveHabit, undoHabitStep } = useHabitStore.getState();
  const actions: SheetAction[] = [
    isSkipped
      ? { label: t('habit.unskipToday'), icon: 'arrow-undo-outline', run: () => skipHabit(habit.id) }
      : { label: t('habit.skipToday'), icon: 'play-skip-forward-outline', run: () => skipHabit(habit.id) },
    { label: t('habit.edit'), icon: 'create-outline', run: () => router.push({ pathname: '/habit/[id]', params: { id: habit.id } }) },
    { label: t('habit.resetToday'), icon: 'refresh-outline', run: () => undoHabitStep(habit.id) },
    { label: t('habit.archive'), icon: 'archive-outline', destructive: true, run: () => void archiveHabit(habit.id) },
  ];
  showActionSheet({ title: habit.title, message: habit.why ? t('habit.why', { why: habit.why }) : undefined, actions });
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
  const tapHabit = useHabitStore((s) => s.tapHabit);
  const undoHabitStep = useHabitStore((s) => s.undoHabitStep);

  const progress = progressOf(log);
  const ratio = completionRatio(habit, progress);
  const isDone = progress.status === 'completed';
  const isSkipped = progress.status === 'skipped';
  const pop = useDonePop(isDone);
  const countLabel = habit.isQuantitative
    ? `${progress.currentCount}/${habit.targetCount}${habit.unit ? ` ${habit.unit}` : ''}`
    : isDone
      ? t('habit.done')
      : t('habit.tapToComplete');

  const onTap = () => {
    const willComplete = habit.isQuantitative ? progress.currentCount + 1 >= habit.targetCount && !isDone : !isDone;
    if (willComplete) haptics.success();
    else haptics.tap();
    tapHabit(habit.id);
  };

  return (
    <View style={[styles.card, isDone && styles.cardDone, isSkipped && styles.cardSkipped]}>
      <Pressable
        onPress={onTap}
        onLongPress={() => {
          haptics.select();
          openHabitMenu(habit, isSkipped);
        }}
        delayLongPress={350}
        accessibilityRole={habit.isQuantitative ? 'adjustable' : 'checkbox'}
        accessibilityState={habit.isQuantitative ? undefined : { checked: isDone }}
        accessibilityLabel={`${habit.title}, ${countLabel}${streak > 0 ? t('habit.streakA11y', { count: streak }) : ''}`}
        accessibilityHint={habit.isQuantitative ? t('habit.hintCount') : t('habit.hintBinary')}
        style={({ pressed }) => [styles.main, pressed && { opacity: 0.75 }]}
      >
        <Animated.View style={[styles.checkCircle, isDone && styles.checkCircleDone, { transform: [{ scale: pop }] }]}>
          {isDone ? (
            <Ionicons name="checkmark" size={22} color={colors.onPrimary} />
          ) : habit.isQuantitative ? (
            <Ionicons name="add" size={22} color={colors.primary} />
          ) : null}
        </Animated.View>
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={[typography.label, styles.title, isSkipped && styles.strike]} numberOfLines={1}>
              {habit.title}
            </Text>
            {streak > 0 ? (
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
          </View>
          <Text style={typography.caption} numberOfLines={1}>
            {isSkipped
              ? t('habit.skipped')
              : anchorTitle
                ? `${t('habit.after', { anchor: anchorTitle })}${habit.microStep ? ` · ${habit.microStep}` : ''}`
                : habit.cue
                  ? `${habit.cue}${habit.microStep ? ` · ${habit.microStep}` : ''}`
                  : habit.microStep
                    ? habit.microStep
                    : countLabel}
          </Text>
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('habit.startFocus', { title: habit.title })}
          hitSlop={8}
          onPress={() => router.push({ pathname: '/focus', params: { habitId: habit.id } })}
          style={[styles.iconButton, styles.focusButton]}
        >
          <Ionicons name="play" size={16} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

export const HabitCard = memo(HabitCardComponent);

const useStyles = makeStyles(({ colors, typography, shadow }) => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.md + 2,
    marginBottom: spacing.sm + 2,
    ...shadow,
  },
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
