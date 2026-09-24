import { useEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Banner, Button, Card } from '@/components/ui';
import { makeStyles, spacing, useTheme } from '@/components/theme';
import { formatFriendlyDate } from '@/core/localDate';
import { MAX_OPEN_TASKS_PER_DAY, hasRoomToday } from '@/domain/taskPlanning';
import { useTaskStore } from '@/state/taskStore';
import { useT } from '@/i18n';

/** Bullet-journal style migration: every unfinished task gets a conscious decision. */
export function ReviewScreen() {
  const t = useT();
  const { typography } = useTheme();
  const styles = useStyles();
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
        {t('review.intro', { max: MAX_OPEN_TASKS_PER_DAY })}
      </Text>
      {error ? <Banner message={error} onDismiss={clearError} /> : null}
      {overdue.map((task) => (
        <Card key={task.id} style={styles.card}>
          <Text style={typography.label}>{task.title}</Text>
          {task.dueDate ? <Text style={typography.caption}>{t('review.plannedFor', { date: formatFriendlyDate(task.dueDate, t.locale) })}</Text> : null}
          <View style={styles.actions}>
            <Button label={t('review.today')} onPress={() => decide(task.id, 'today')} disabled={!roomToday} style={styles.action} />
            <Button label={t('review.later')} variant="secondary" onPress={() => decide(task.id, 'later')} style={styles.action} />
            <Button label={t('review.drop')} variant="danger" onPress={() => decide(task.id, 'drop')} style={styles.action} />
          </View>
        </Card>
      ))}
      {!roomToday && overdue.length > 0 ? (
        <Text style={typography.caption}>{t('review.full')}</Text>
      ) : null}
    </ScrollView>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  card: { gap: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  action: { flex: 1, paddingHorizontal: spacing.sm },
}));
