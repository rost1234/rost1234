import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Text';
import { Button, InlineError, ProgressBar } from '@/components/ui';
import { cancelLessonQueue, clearLessonJob, startLessonQueue, useLessonQueue } from '@/data/lessonQueue';
import { useT } from '@/i18n';
import { useAiConfigured } from '@/lib/env';
import { haptics } from '@/lib/haptics';
import { isImportedCourse, stationsNeedingLessons } from '@/local/logic';
import { useDBStore } from '@/local/store';
import type { Course } from '@/content/types';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

/** How many lessons one "next batch" writes when a course has many missing. */
const BATCH = 25;

/**
 * On a course map: write the lessons that don't exist yet, all at once or the next
 * batch. It keeps going in the background (two at a time), waits out the server's
 * hourly limit by itself, skips a lesson that fails and lists it, and can be stopped.
 */
export function LessonQueueCard({ course }: { course: Course }) {
  const t = useT();
  const styles = useStyles();
  const { typography } = useTheme();
  const aiReady = useAiConfigured();
  const missing = useDBStore((s) => stationsNeedingLessons(s.db, course).length);
  const job = useLessonQueue((s) => s.jobs[course.id]);
  const [minutes, setMinutes] = useState(1);
  const waiting = job?.waitUntil ?? null;
  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(() => setMinutes(Math.max(1, Math.ceil((waiting - Date.now()) / 60000))), 1000);
    return () => clearInterval(id);
  }, [waiting]);

  const imported = isImportedCourse(course.id);
  const running = job?.running === true;
  const finished = job && !job.running;
  if (!missing && !job) return null;

  const start = (limit?: number) => {
    haptics.tap();
    clearLessonJob(course.id);
    void startLessonQueue(course.id, limit).then(() => haptics.success());
  };

  if (finished && !missing)
    return (
      <View style={styles.card}>
        <Text style={typography.subheading}>✓ {t('queue.done', { ok: job.done - job.failed.length })}</Text>
        <Button label={t('queue.dismiss')} variant="ghost" onPress={() => clearLessonJob(course.id)} />
      </View>
    );

  return (
    <View style={styles.card}>
      {running ? (
        <>
          <Text style={typography.subheading}>✨ {t('queue.running', { done: job.done, total: job.total })}</Text>
          <ProgressBar value={job.total ? job.done / job.total : 0} />
          <Text style={typography.caption}>{waiting ? t('queue.waiting', { minutes }) : t('queue.keepOpen')}</Text>
          <Button label={t('queue.stop')} variant="secondary" onPress={() => cancelLessonQueue(course.id)} />
        </>
      ) : (
        <>
          <Text style={typography.subheading}>✨ {t(imported ? 'queue.titleImported' : 'queue.title', { n: missing })}</Text>
          <Text style={typography.caption}>{t(imported ? 'queue.bodyImported' : 'queue.body')}</Text>
          {finished && job.done > 0 ? (
            <Text style={typography.caption}>{t('queue.last', { ok: job.done - job.failed.length, failed: job.failed.length })}</Text>
          ) : null}
          {missing > BATCH ? <Button label={t('queue.next', { n: BATCH })} icon="sparkles-outline" disabled={!aiReady} onPress={() => start(BATCH)} /> : null}
          {missing > 0 ? (
            <Button
              label={t(missing > BATCH ? 'queue.all' : imported ? 'queue.upgradeAll' : 'queue.writeAll', { n: missing })}
              icon="sparkles-outline"
              variant={missing > BATCH ? 'secondary' : 'primary'}
              disabled={!aiReady}
              onPress={() => start()}
            />
          ) : null}
          {finished && job.failed.length ? <Text style={[typography.caption, styles.warn]}>{t('queue.failedHint', { n: job.failed.length })}</Text> : null}
          <InlineError message={!aiReady ? t('error.aiNotConfigured') : null} />
        </>
      )}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  card: { backgroundColor: colors.primarySoft, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  warn: { color: colors.danger },
}));
