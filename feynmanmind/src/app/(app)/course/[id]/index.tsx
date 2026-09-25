import { Pressable, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Card, Chip, ErrorState, IconButton, LoadingState, ProgressBar, Screen, type IconName } from '@/components/ui';
import { useCourse, useDeleteCourse } from '@/data/courses';
import { useT } from '@/i18n';
import { confirmAsync } from '@/lib/dialogs';
import { errorMessage } from '@/lib/errors';
import type { StationStatus } from '@/local/logic';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

/** The learning map: four levels of ordered stations, from the basics to master's depth. */
export default function CourseMapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const query = useCourse(id);
  const remove = useDeleteCourse();

  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState message={errorMessage(query.error, t)} onRetry={() => void query.refetch()} />;
  const { course, progress } = query.data;
  const nextLevel = progress.stations.find((s) => s.key === progress.nextKey)?.levelIndex;

  const confirmDelete = async () => {
    const ok = await confirmAsync({
      title: t('course.deleteTitle', { title: course.title }),
      message: t('course.deleteBody'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (ok) remove.mutate(course.id, { onSuccess: () => router.back() });
  };

  const hasQuiz = course.levels.some((l) => l.quiz.length > 0);
  let stationNumber = 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: course.title,
          headerRight: course.builtIn
            ? undefined
            : () => <IconButton icon="trash-outline" label={t('common.delete')} color={colors.danger} onPress={() => void confirmDelete()} />,
        }}
      />
      <Screen>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name={course.icon as IconName} size={30} color={colors.primary} />
          </View>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text style={typography.heading}>{course.title}</Text>
            <Text style={typography.caption}>{course.description}</Text>
          </View>
        </View>
        <View style={styles.progressRow}>
          <ProgressBar value={progress.total ? progress.done / progress.total : 0} />
          <Text style={typography.caption}>{t('courses.progress', { done: progress.done, total: progress.total })}</Text>
        </View>

        {hasQuiz ? (
          progress.placement ? (
            <View style={styles.placed}>
              <Ionicons name="locate-outline" size={18} color={colors.primary} />
              <Text style={[typography.caption, { flex: 1 }]}>
                {t('placement.placedAt', { level: t(`level.${course.levels[progress.placement.levelIndex]!.key}`) })}
              </Text>
              <Button label={t('placement.retake')} variant="ghost" onPress={() => router.push(`/course/${course.id}/placement`)} />
            </View>
          ) : (
            <Card style={styles.placementCard}>
              <View style={styles.row}>
                <Ionicons name="school-outline" size={22} color={colors.primary} />
                <Text style={[typography.subheading, { flex: 1 }]}>{t('placement.inviteTitle')}</Text>
              </View>
              <Text style={typography.caption}>{t('placement.inviteBody')}</Text>
              <Button label={t('placement.take')} icon="help-circle-outline" onPress={() => router.push(`/course/${course.id}/placement`)} />
            </Card>
          )
        ) : null}

        {progress.nextKey ? (
          <Button
            label={progress.started === 0 && !progress.placement ? t('course.start') : t('course.continue')}
            icon="play"
            variant={progress.placement || progress.started ? 'primary' : 'secondary'}
            onPress={() => router.push(`/course/${course.id}/${progress.nextKey}`)}
          />
        ) : (
          <View style={styles.done}>
            <Ionicons name="trophy" size={22} color={colors.success} />
            <Text style={[typography.subheading, { color: colors.success, flex: 1 }]}>{t('course.completed')}</Text>
          </View>
        )}

        {course.levels.map((level, levelIndex) => {
          const lp = progress.levels[levelIndex]!;
          return (
            <View key={level.key} style={{ gap: spacing.sm }}>
              <View style={styles.levelHeader}>
                <View style={[styles.levelBadge, levelIndex === nextLevel && { backgroundColor: colors.primary }]}>
                  <Text style={[styles.levelBadgeText, levelIndex === nextLevel && { color: colors.onPrimary }]}>{levelIndex + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={typography.subheading} accessibilityRole="header">
                    {t(`level.${level.key}`)}
                  </Text>
                  <Text style={typography.caption}>{t(`level.${level.key}.hint`)}</Text>
                </View>
                {lp.known ? <Chip label={t('placement.known')} tone="success" /> : <Text style={typography.caption}>{`${lp.done}/${lp.total}`}</Text>}
              </View>

              {level.stations.map((station) => {
                const i = stationNumber++;
                const p = progress.stations[i]!;
                const isNext = p.key === progress.nextKey;
                const lastInLevel = station === level.stations[level.stations.length - 1];
                return (
                  <View key={station.key} style={styles.stationRow}>
                    <View style={styles.rail}>
                      <StationDot index={i} status={p.status} highlight={isNext} />
                      {!lastInLevel ? <View style={[styles.line, (p.status === 'mastered' || p.status === 'known') && { backgroundColor: colors.success }]} /> : null}
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${t('course.station', { n: i + 1 })}: ${station.title}`}
                      onPress={() => router.push(`/course/${course.id}/${station.key}`)}
                      style={({ pressed }) => [styles.stationCard, isNext && styles.stationNext, p.status === 'known' && styles.stationKnown, pressed && { opacity: 0.85 }]}
                    >
                      <View style={styles.row}>
                        <Text style={[typography.subheading, { flex: 1 }]}>{station.title}</Text>
                        {isNext ? <Chip label={t('course.next')} tone="primary" /> : null}
                      </View>
                      <Text style={typography.caption}>{station.summary}</Text>
                      <View style={styles.row}>
                        {p.status === 'mastered' ? <Chip label={t('course.mastered', { score: p.mastery })} tone="success" /> : null}
                        {p.status === 'started' ? <Chip label={t('course.inProgress')} tone="warning" /> : null}
                        {p.status === 'known' ? <Chip label={t('placement.known')} tone="success" /> : null}
                        {!p.hasLesson && p.status !== 'known' ? (
                          <Text style={[typography.caption, { color: colors.primary }]}>{t('course.aiLesson')}</Text>
                        ) : null}
                      </View>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          );
        })}
      </Screen>
    </>
  );
}

function StationDot({ index, status, highlight }: { index: number; status: StationStatus; highlight: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const bg =
    status === 'mastered' || status === 'known' ? colors.success : status === 'started' || highlight ? colors.primary : colors.surfaceMuted;
  const fg = status === 'new' && !highlight ? colors.textMuted : colors.onPrimary;
  return (
    <View style={[styles.dot, { backgroundColor: bg }]}>
      {status === 'mastered' || status === 'known' ? (
        <Ionicons name="checkmark" size={18} color={fg} />
      ) : (
        <Text style={{ color: fg, fontWeight: '800' }}>{index + 1}</Text>
      )}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  placementCard: { borderColor: colors.primary, borderWidth: 2 },
  placed: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  done: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  levelHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  levelBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadgeText: { color: colors.primary, fontWeight: '800' },
  stationRow: { flexDirection: 'row', gap: spacing.md },
  rail: { alignItems: 'center', width: 36 },
  dot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  line: { flex: 1, width: 3, backgroundColor: colors.border, marginVertical: 2, borderRadius: 2 },
  stationCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  stationNext: { borderColor: colors.primary, borderWidth: 2 },
  stationKnown: { opacity: 0.75 },
}));
