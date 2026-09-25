import { Pressable, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Chip, ErrorState, IconButton, LoadingState, ProgressBar, Screen, type IconName } from '@/components/ui';
import { useCourse, useDeleteCourse } from '@/data/courses';
import { useT } from '@/i18n';
import { confirmAsync } from '@/lib/dialogs';
import { errorMessage } from '@/lib/errors';
import type { StationStatus } from '@/local/logic';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

/** The learning map: an ordered path of stations, each building on the previous ones. */
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
  const total = course.concepts.length;

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
          <ProgressBar value={total ? progress.mastered / total : 0} />
          <Text style={typography.caption}>{t('courses.progress', { done: progress.mastered, total })}</Text>
        </View>
        {progress.nextKey ? (
          <Button
            label={progress.started === 0 ? t('course.start') : t('course.continue')}
            icon="play"
            onPress={() => router.push(`/course/${course.id}/${progress.nextKey}`)}
          />
        ) : (
          <View style={styles.done}>
            <Ionicons name="trophy" size={22} color={colors.success} />
            <Text style={[typography.subheading, { color: colors.success, flex: 1 }]}>{t('course.completed')}</Text>
          </View>
        )}

        <View accessibilityRole="list">
          {course.concepts.map((station, i) => {
            const p = progress.stations[i]!;
            const isNext = p.key === progress.nextKey;
            const last = i === total - 1;
            return (
              <View key={station.key} style={styles.stationRow}>
                <View style={styles.rail}>
                  <StationDot index={i} status={p.status} highlight={isNext} />
                  {!last ? <View style={[styles.line, p.status === 'mastered' && { backgroundColor: colors.success }]} /> : null}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${t('course.station', { n: i + 1 })}: ${station.title}`}
                  onPress={() => router.push(`/course/${course.id}/${station.key}`)}
                  style={({ pressed }) => [styles.stationCard, isNext && styles.stationNext, pressed && { opacity: 0.85 }]}
                >
                  <View style={styles.stationTop}>
                    <Text style={[typography.subheading, { flex: 1 }]}>{station.title}</Text>
                    {isNext ? <Chip label={t('course.next')} tone="primary" /> : null}
                  </View>
                  <Text style={typography.caption}>{station.summary}</Text>
                  {p.status !== 'new' ? (
                    <Chip
                      label={p.status === 'mastered' ? t('course.mastered', { score: p.mastery }) : t('course.inProgress')}
                      tone={p.status === 'mastered' ? 'success' : 'warning'}
                    />
                  ) : null}
                </Pressable>
              </View>
            );
          })}
        </View>
      </Screen>
    </>
  );
}

function StationDot({ index, status, highlight }: { index: number; status: StationStatus; highlight: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const bg = status === 'mastered' ? colors.success : status === 'started' || highlight ? colors.primary : colors.surfaceMuted;
  const fg = status === 'new' && !highlight ? colors.textMuted : colors.onPrimary;
  return (
    <View style={[styles.dot, { backgroundColor: bg }]}>
      {status === 'mastered' ? (
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
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  done: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
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
  stationTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
}));
