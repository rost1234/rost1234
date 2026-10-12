import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/AppText';
import { ProgressBar } from '@/components/ui';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { haptics } from '@/core/haptics';
import { habitPotStage } from '@/domain/garden';
import { progressOf } from '@/domain/habitProgress';
import type { Habit } from '@/domain/models';
import { Sprout } from '@/features/garden/Sprout';
import { useT } from '@/i18n';
import { useGroupFoldStore } from '@/state/groupFoldStore';
import { useHabitStore } from '@/state/habitStore';
import { HabitCard } from './HabitCard';

/** One habit of a folded group: a pill that marks it (or adds one) with a tap. */
function MemberPill({ habit }: { habit: Habit }) {
  const t = useT();
  const { colors } = useTheme();
  const styles = useStyles();
  const log = useHabitStore((s) => (s.today ? s.logs[habit.id]?.[s.today] : undefined));
  const tapHabit = useHabitStore((s) => s.tapHabit);
  const progress = progressOf(log);
  const isDone = progress.status === 'completed';
  const isSkipped = progress.status === 'skipped';
  const count = habit.isQuantitative ? `${progress.currentCount}/${habit.targetCount}` : null;
  const mark = () => {
    const willComplete = habit.isQuantitative ? progress.currentCount + 1 >= habit.targetCount && !isDone : !isDone;
    if (willComplete) haptics.success();
    else haptics.tap();
    tapHabit(habit.id);
  };
  return (
    <Pressable
      accessibilityRole={habit.isQuantitative ? 'adjustable' : 'checkbox'}
      accessibilityState={habit.isQuantitative ? { disabled: isSkipped } : { checked: isDone, disabled: isSkipped }}
      accessibilityLabel={`${habit.title}${count ? `, ${count}` : ''}${isDone ? `, ${t('habit.done')}` : ''}${isSkipped ? `, ${t('group.skipped')}` : ''}`}
      accessibilityHint={isSkipped ? undefined : habit.isQuantitative ? t('habit.hintCount') : t('habit.hintBinary')}
      // Swipe up on a counted habit adds one, like a tap.
      accessibilityActions={habit.isQuantitative ? [{ name: 'increment' }] : undefined}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment') mark();
      }}
      disabled={isSkipped}
      onPress={mark}
      style={({ pressed }) => [styles.pill, isDone && styles.pillDone, isSkipped && styles.pillSkipped, pressed && { opacity: 0.8 }]}
    >
      <Ionicons
        name={isDone ? 'checkmark-circle' : habit.isQuantitative ? 'add-circle-outline' : 'ellipse-outline'}
        size={18}
        color={isDone ? colors.success : colors.primary}
      />
      <Text style={styles.pillText} numberOfLines={1}>
        {habit.title}
      </Text>
      {count && !isDone ? <Text style={styles.pillCount}>{count}</Text> : null}
    </Pressable>
  );
}

/**
 * Habits that share a group ("Fitness": strength, running, stretching) on one card. Folded, each
 * habit is a pill to mark with one tap; unfolded, the full cards. Each habit keeps its own target
 * and its own growth.
 */
export function HabitGroupCard({ name, habits }: { name: string; habits: readonly Habit[] }) {
  const t = useT();
  const { colors, typography, look } = useTheme();
  const styles = useStyles();
  const open = useGroupFoldStore((s) => s.open[name] === true);
  const toggle = useGroupFoldStore((s) => s.toggle);
  const done = useHabitStore((s) => habits.filter((h) => s.today && s.logs[h.id]?.[s.today]?.status === 'completed').length);
  // Garden: the group's pot shows its most grown habit.
  const potDays = useHabitStore((s) => Math.max(0, ...habits.map((h) => s.completedBefore[h.id] ?? 0)));
  const allDone = done === habits.length;

  return (
    <View style={[styles.card, allDone && styles.cardDone]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={t('group.a11y', { name, done, total: habits.length })}
        accessibilityHint={open ? t('group.fold') : t('group.unfold')}
        onPress={() => {
          haptics.select();
          toggle(name);
        }}
        style={({ pressed }) => [styles.header, pressed && { opacity: 0.8 }]}
      >
        {look === 'garden' ? (
          <View style={styles.pot}>
            <Sprout stage={habitPotStage(potDays)} size={40} face={false} />
          </View>
        ) : (
          <View style={styles.icon}>
            <Ionicons name="layers-outline" size={20} color={colors.primary} />
          </View>
        )}
        <View style={styles.headerText}>
          <Text style={[typography.label, styles.name]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={typography.caption}>{allDone ? t('group.allDone') : t('group.doneOf', { done, total: habits.length })}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
      </Pressable>
      <ProgressBar value={done / habits.length} color={colors.success} height={6} />
      {open ? (
        <View style={styles.members}>
          {habits.map((habit) => (
            <HabitCard key={habit.id} habit={habit} />
          ))}
        </View>
      ) : (
        <View style={styles.pills}>
          {habits.map((habit) => (
            <MemberPill key={habit.id} habit={habit} />
          ))}
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles(({ colors, flat }) => ({
  card: {
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm + 2,
    ...flat,
  },
  cardDone: { backgroundColor: colors.doneCard },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 44 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  pot: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  headerText: { flex: 1, gap: 2 },
  name: { fontSize: 17 },
  members: { marginTop: spacing.xs },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    maxWidth: '100%',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  pillDone: { backgroundColor: colors.successSoft, borderColor: 'transparent' },
  pillSkipped: { opacity: 0.5 },
  pillText: { fontSize: 15, color: colors.text, flexShrink: 1 },
  pillCount: { fontSize: 13, color: colors.textMuted, fontVariant: ['tabular-nums'] },
}));
