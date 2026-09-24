import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import type { DailyReflection } from '@/domain/models';
import { useTaskStore } from '@/state/taskStore';
import { ReflectionPrompt } from './ReflectionPrompt';
import { useT } from '@/i18n';

interface MoreSectionProps {
  unscheduledCount: number;
  /** Shown here only when it isn't already on the main screen (evening). */
  reflection: DailyReflection | null | undefined;
  showReflection: boolean;
}

/** Everything that isn't "today's paper" lives behind one collapsed row. */
export function MoreSection({ unscheduledCount, reflection, showReflection }: MoreSectionProps) {
  const t = useT();
  const { typography } = useTheme();
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const later = useTaskStore((s) => s.later);
  const decide = useTaskStore((s) => s.decide);

  const summary = [
    later.length > 0 ? t('more.laterCount', { count: later.length }) : null,
    unscheduledCount > 0 ? t.plural('more.restingHabits', unscheduledCount) : null,
  ]
    .filter((part): part is string => part !== null)
    .join(' · ');

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        style={styles.header}
        hitSlop={8}
      >
        <Text style={typography.label}>{open ? '▾' : '▸'} More</Text>
        {summary ? <Text style={typography.caption}>{summary}</Text> : null}
      </Pressable>

      {open ? (
        <View style={styles.body}>
          <Text style={typography.label}>{t('more.later')}</Text>
          {later.length === 0 ? (
            <Text style={typography.caption}>{t('more.laterEmpty')}</Text>
          ) : (
            later.map((task) => (
              <View key={task.id} style={styles.laterRow}>
                <Text style={[typography.body, { flex: 1 }]} numberOfLines={2}>
                  {task.title}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('more.moveToday', { title: task.title })}
                  onPress={() => decide(task.id, 'today')}
                  hitSlop={8}
                  style={styles.pill}
                >
                  <Text style={styles.pillText}>{t('more.toToday')}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('more.dropA11y', { title: task.title })}
                  onPress={() => decide(task.id, 'drop')}
                  hitSlop={8}
                >
                  <Text style={styles.drop}>✕</Text>
                </Pressable>
              </View>
            ))
          )}
          {showReflection ? <ReflectionPrompt reflection={reflection} /> : null}
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(({ colors, shadow }) => ({
  container: { marginTop: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  body: { gap: spacing.md, paddingTop: spacing.sm },
  laterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    ...shadow,
  },
  pill: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill, backgroundColor: colors.primarySoft },
  pillText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  drop: { fontSize: 16, color: colors.textMuted, paddingHorizontal: spacing.xs },
}));
