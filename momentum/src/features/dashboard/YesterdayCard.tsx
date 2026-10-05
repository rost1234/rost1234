import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { runDetached } from '@/core/errors';
import { haptics } from '@/core/haptics';
import { addDays, type LocalDateString } from '@/core/localDate';
import { habitStartDate, habitsDueOn } from '@/domain/habitSchedule';
import type { Habit } from '@/domain/models';
import { isPaused } from '@/domain/pauses';
import { useHabitStore } from '@/state/habitStore';
import { usePlanningStore } from '@/state/planningStore';
import { useT } from '@/i18n';
import { useHomePromptSlot } from './homePrompts';

const KEY = 'momentum.yesterday.v1';
/** Only in the morning: by the afternoon, yesterday is history. */
const UNTIL_HOUR = 13;

/** Yesterday's due habits that weren't logged at all (not done, not skipped). */
function openYesterday(habits: readonly Habit[], logs: ReturnType<typeof useHabitStore.getState>['logs'], yesterday: LocalDateString, pauses: Parameters<typeof isPaused>[0]): Habit[] {
  return habitsDueOn(habits, yesterday).filter((h) => {
    if (habitStartDate(h) > yesterday || isPaused(pauses, yesterday, h.id)) return false;
    const status = logs[h.id]?.[yesterday]?.status;
    return status !== 'completed' && status !== 'skipped';
  });
}

/**
 * Like filling in a paper tracker over morning coffee: habits done yesterday
 * without being checked off can be added in one tap. Each tap counts for
 * yesterday (streaks included); the card goes away when closed or at 13:00.
 */
export function YesterdayCard({ today, hour }: { today: LocalDateString; hour: number }) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const yesterday = addDays(today, -1);
  const [closedOn, setClosedOn] = useState<string | null | undefined>(undefined);
  const habits = useHabitStore((s) => s.habits);
  const logs = useHabitStore((s) => s.logs);
  const ready = useHabitStore((s) => s.today === today && s.status === 'ready');
  const completeOnDate = useHabitStore((s) => s.completeOnDate);
  const pauses = usePlanningStore((s) => s.pauses);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then(setClosedOn)
      .catch(() => setClosedOn(today));
  }, [today]);

  const open = openYesterday(habits, logs, yesterday, pauses);
  const wants = ready && hour < UNTIL_HOUR && closedOn !== undefined && closedOn !== today && open.length > 0;
  const isMine = useHomePromptSlot('yesterday', wants);
  if (!isMine) return null;

  const close = () => {
    setClosedOn(today);
    runDetached(AsyncStorage.setItem(KEY, today));
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={[typography.label, { flex: 1 }]}>{t('yday.title')}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t('sheet.close')} onPress={close} hitSlop={10}>
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </Pressable>
      </View>
      <Text style={typography.caption}>{t('yday.lead')}</Text>
      <View style={styles.chips}>
        {open.map((habit) => (
          <Pressable
            key={habit.id}
            accessibilityRole="button"
            accessibilityLabel={habit.isQuit ? t('yday.markQuitA11y', { title: habit.title }) : t('yday.markA11y', { title: habit.title })}
            onPress={() => {
              haptics.success();
              runDetached(completeOnDate(habit.id, yesterday));
            }}
            style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name={habit.isQuit ? 'shield-checkmark' : 'checkmark'} size={14} color={colors.primary} />
            <Text style={styles.chipText} numberOfLines={1}>
              {habit.title}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colors, typography }) => ({
  card: { gap: spacing.sm, padding: spacing.lg, marginBottom: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '100%',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  chipText: { ...typography.label, color: colors.primary, flexShrink: 1 },
}));
