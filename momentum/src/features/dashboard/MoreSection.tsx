import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/components/theme';
import type { DailyReflection } from '@/domain/models';
import { useTaskStore } from '@/state/taskStore';
import { ReflectionPrompt } from './ReflectionPrompt';

interface MoreSectionProps {
  unscheduledCount: number;
  /** Shown here only when it isn't already on the main screen (evening). */
  reflection: DailyReflection | null | undefined;
  showReflection: boolean;
}

/** Everything that isn't "today's paper" lives behind one collapsed row. */
export function MoreSection({ unscheduledCount, reflection, showReflection }: MoreSectionProps) {
  const [open, setOpen] = useState(false);
  const later = useTaskStore((s) => s.later);
  const decide = useTaskStore((s) => s.decide);

  const summary = [
    later.length > 0 ? `${later.length} later` : null,
    unscheduledCount > 0 ? `${unscheduledCount} habit${unscheduledCount === 1 ? '' : 's'} rest today` : null,
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
          <Text style={typography.label}>Later</Text>
          {later.length === 0 ? (
            <Text style={typography.caption}>Nothing parked. Tasks beyond today’s 3 land here.</Text>
          ) : (
            later.map((task) => (
              <View key={task.id} style={styles.laterRow}>
                <Text style={[typography.body, { flex: 1 }]} numberOfLines={2}>
                  {task.title}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Move ${task.title} to today`}
                  onPress={() => decide(task.id, 'today')}
                  hitSlop={8}
                  style={styles.pill}
                >
                  <Text style={styles.pillText}>→ Today</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Drop ${task.title}`}
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

const styles = StyleSheet.create({
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
  },
  pill: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill, backgroundColor: colors.primarySoft },
  pillText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  drop: { fontSize: 16, color: colors.textMuted, paddingHorizontal: spacing.xs },
});
