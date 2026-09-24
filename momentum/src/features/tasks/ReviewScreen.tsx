import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Banner, Button, Card } from '@/components/ui';
import { colors, spacing, typography } from '@/components/theme';
import { formatFriendlyDate } from '@/core/localDate';
import { MAX_OPEN_TASKS_PER_DAY, hasRoomToday } from '@/domain/taskPlanning';
import { useTaskStore } from '@/state/taskStore';

/** Bullet-journal style migration: every unfinished task gets a conscious decision. */
export function ReviewScreen() {
  const overdue = useTaskStore((s) => s.overdue);
  const tasks = useTaskStore((s) => s.tasks);
  const today = useTaskStore((s) => s.today);
  const error = useTaskStore((s) => s.error);
  const decide = useTaskStore((s) => s.decide);
  const clearError = useTaskStore((s) => s.clearError);
  const roomToday = today !== null && hasRoomToday(tasks, today);

  useEffect(() => {
    if (overdue.length === 0 && router.canGoBack()) router.back();
  }, [overdue.length]);

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <Text style={typography.body}>
        Decide for each: bring it to today (max {MAX_OPEN_TASKS_PER_DAY}), park it for Later, or let it go.
      </Text>
      {error ? <Banner message={error} onDismiss={clearError} /> : null}
      {overdue.map((task) => (
        <Card key={task.id} style={styles.card}>
          <Text style={typography.label}>{task.title}</Text>
          {task.dueDate ? <Text style={typography.caption}>Planned for {formatFriendlyDate(task.dueDate)}</Text> : null}
          <View style={styles.actions}>
            <Button label="Today" onPress={() => decide(task.id, 'today')} disabled={!roomToday} style={styles.action} />
            <Button label="Later" variant="secondary" onPress={() => decide(task.id, 'later')} style={styles.action} />
            <Button label="Drop" variant="danger" onPress={() => decide(task.id, 'drop')} style={styles.action} />
          </View>
        </Card>
      ))}
      {!roomToday && overdue.length > 0 ? (
        <Text style={typography.caption}>Today is full. Finish or move a task to bring more in.</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  card: { gap: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  action: { flex: 1, paddingHorizontal: spacing.sm },
});
