import { memo } from 'react';
import { ActionSheetIOS, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ProgressBar } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/components/theme';
import { completionRatio, progressOf } from '@/domain/habitProgress';
import type { Habit } from '@/domain/models';
import { useHabitStore } from '@/state/habitStore';

interface HabitCardProps {
  habit: Habit;
}

function openHabitMenu(habit: Habit, isSkipped: boolean) {
  const { skipHabit, archiveHabit, undoHabitStep } = useHabitStore.getState();
  const skipLabel = isSkipped ? 'Unskip today' : 'Skip today';
  const actions: { label: string; run: () => void; destructive?: boolean }[] = [
    { label: skipLabel, run: () => skipHabit(habit.id) },
    { label: 'Reset today', run: () => undoHabitStep(habit.id) },
    {
      label: 'Archive habit',
      destructive: true,
      run: () => void archiveHabit(habit.id),
    },
  ];

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: habit.title,
        options: [...actions.map((a) => a.label), 'Cancel'],
        destructiveButtonIndex: actions.findIndex((a) => a.destructive),
        cancelButtonIndex: actions.length,
      },
      (index) => actions[index]?.run(),
    );
    return;
  }
  Alert.alert(habit.title, undefined, [
    ...actions.map((a) => ({ text: a.label, onPress: a.run, style: a.destructive ? ('destructive' as const) : ('default' as const) })),
    { text: 'Cancel', style: 'cancel' as const },
  ]);
}

function HabitCardComponent({ habit }: HabitCardProps) {
  // Each card subscribes only to its own slice, so a tap re-renders one card.
  const log = useHabitStore((s) => (s.today ? s.logs[habit.id]?.[s.today] : undefined));
  const streak = useHabitStore((s) => s.streaks[habit.id] ?? 0);
  const tapHabit = useHabitStore((s) => s.tapHabit);
  const undoHabitStep = useHabitStore((s) => s.undoHabitStep);

  const progress = progressOf(log);
  const ratio = completionRatio(habit, progress);
  const isDone = progress.status === 'completed';
  const isSkipped = progress.status === 'skipped';
  const countLabel = habit.isQuantitative
    ? `${progress.currentCount}/${habit.targetCount}${habit.unit ? ` ${habit.unit}` : ''}`
    : isDone
      ? 'Done'
      : 'Tap to complete';

  return (
    <View style={[styles.card, isDone && styles.cardDone, isSkipped && styles.cardSkipped]}>
      <Pressable
        onPress={() => tapHabit(habit.id)}
        onLongPress={() => openHabitMenu(habit, isSkipped)}
        delayLongPress={350}
        accessibilityRole={habit.isQuantitative ? 'adjustable' : 'checkbox'}
        accessibilityState={habit.isQuantitative ? undefined : { checked: isDone }}
        accessibilityLabel={`${habit.title}, ${countLabel}${streak > 0 ? `, ${streak} day streak` : ''}`}
        accessibilityHint={habit.isQuantitative ? 'Tap to add one. Long press for options.' : 'Tap to toggle. Long press for options.'}
        style={({ pressed }) => [styles.main, pressed && { opacity: 0.7 }]}
      >
        <View style={[styles.checkCircle, isDone && styles.checkCircleDone]}>
          <Text style={[styles.checkText, isDone && { color: colors.onPrimary }]}>
            {isDone ? '✓' : habit.isQuantitative ? '+' : ''}
          </Text>
        </View>
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={[typography.label, styles.title, isSkipped && styles.strike]} numberOfLines={1}>
              {habit.title}
            </Text>
            {streak > 0 ? <Text style={styles.streak}>🔥 {streak}</Text> : null}
          </View>
          <Text style={typography.caption} numberOfLines={1}>
            {isSkipped ? 'Skipped today' : habit.microStep ? `↳ ${habit.microStep}` : countLabel}
          </Text>
          {habit.isQuantitative ? (
            <View style={styles.progressRow}>
              <View style={{ flex: 1 }}>
                <ProgressBar value={ratio} color={isDone ? colors.success : colors.primary} />
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
            accessibilityLabel={`Undo one ${habit.unit || 'step'} for ${habit.title}`}
            hitSlop={8}
            onPress={() => undoHabitStep(habit.id)}
            style={styles.smallButton}
          >
            <Text style={styles.smallButtonText}>−</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Start focus session for ${habit.title}`}
          hitSlop={8}
          onPress={() => router.push({ pathname: '/focus', params: { habitId: habit.id } })}
          style={styles.focusButton}
        >
          <Text style={styles.focusText}>▶ Focus</Text>
        </Pressable>
      </View>
    </View>
  );
}

export const HabitCard = memo(HabitCardComponent);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  cardDone: { backgroundColor: colors.successSoft, borderColor: colors.successSoft },
  cardSkipped: { opacity: 0.6 },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  checkCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleDone: { backgroundColor: colors.success, borderColor: colors.success },
  checkText: { fontSize: 20, fontWeight: '700', color: colors.primary },
  body: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flexShrink: 1, fontSize: 16 },
  strike: { textDecorationLine: 'line-through' },
  streak: { fontSize: 13, fontWeight: '600', color: colors.warning },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  count: { ...typography.caption, fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginLeft: spacing.sm },
  smallButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallButtonText: { fontSize: 18, fontWeight: '700', color: colors.textMuted },
  focusButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  focusText: { fontSize: 13, fontWeight: '700', color: colors.primary },
});
