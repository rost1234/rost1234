import { Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScoreRing } from '@/components/ScoreRing';
import { Button, Card, Chip, ErrorState, InlineError, LoadingState, Screen, SectionHeader } from '@/components/ui';
import { useStartStation, useStation, useWriteStationLesson } from '@/data/courses';
import { useT } from '@/i18n';
import { useAiConfigured } from '@/lib/env';
import { errorMessage } from '@/lib/errors';
import { haptics } from '@/lib/haptics';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

/**
 * One station on the map: read the lesson (written by the AI on first visit
 * if it doesn't ship with one), start it (adds the concept and its flashcards
 * to the library), explain it, review, and move on.
 */
export default function StationScreen() {
  const { id, key } = useLocalSearchParams<{ id: string; key: string }>();
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const aiReady = useAiConfigured();
  const query = useStation(id, key);
  const start = useStartStation();
  const write = useWriteStationLesson();

  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState message={errorMessage(query.error, t)} onRetry={() => void query.refetch()} />;
  const { course, ref, total, next, lesson, progress: p } = query.data;
  const { station, level } = ref;

  return (
    <>
      <Stack.Screen options={{ title: t('course.station', { n: ref.index + 1 }) }} />
      <Screen>
        <View style={{ gap: spacing.xs }}>
          <Text style={typography.caption}>
            {course.title} · {t('course.stationOf', { n: ref.index + 1, total })}
          </Text>
          <Chip label={t(`level.${level.key}`)} tone="primary" />
          <Text style={typography.title}>{station.title}</Text>
          <Text style={[typography.body, { color: colors.textMuted }]}>{station.summary}</Text>
        </View>

        {lesson ? (
          <Card>
            {lesson.explanation.split(/\n\s*\n/).map((paragraph, i) => (
              <Text key={i} style={[typography.body, styles.paragraph]} selectable>
                {paragraph.trim()}
              </Text>
            ))}
          </Card>
        ) : (
          <View style={styles.cta}>
            <View style={styles.row}>
              <Ionicons name="sparkles" size={20} color={colors.primary} />
              <Text style={[typography.subheading, { flex: 1 }]}>{t('lesson.missingTitle')}</Text>
            </View>
            <Text style={typography.body}>{t('lesson.missingBody', { level: t(`level.${level.key}`) })}</Text>
            <InlineError message={!aiReady ? t('error.aiNotConfigured') : write.error ? errorMessage(write.error, t) : null} />
            {write.isPending ? (
              <LoadingState label={t('lesson.writing')} />
            ) : (
              <Button
                label={t('lesson.write')}
                icon="create-outline"
                disabled={!aiReady}
                onPress={() => write.mutate({ courseId: course.id, key: station.key, language: 'he' }, { onSuccess: () => haptics.success() })}
              />
            )}
          </View>
        )}

        {lesson && (p.status === 'new' || p.status === 'known') ? (
          <View style={styles.cta}>
            {p.status === 'known' ? <Text style={[typography.caption, { color: colors.success }]}>{t('placement.knownHint')}</Text> : null}
            <Text style={typography.body}>{t('course.startBody', { count: lesson.cards.length })}</Text>
            <Button
              label={t('course.startStation')}
              icon="flag-outline"
              onPress={() => start.mutate({ courseId: course.id, key: station.key }, { onSuccess: () => haptics.success() })}
              loading={start.isPending}
            />
            <InlineError message={start.error ? errorMessage(start.error, t) : null} />
          </View>
        ) : null}

        {p.conceptId ? (
          <>
            <Card style={styles.status}>
              <ScoreRing score={p.mastery} size={64} stroke={6} caption={t('concept.mastery')} />
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Chip
                  label={p.status === 'mastered' ? t('course.mastered', { score: p.mastery }) : t('course.inProgress')}
                  tone={p.status === 'mastered' ? 'success' : 'warning'}
                />
                <Text style={typography.caption}>{p.status === 'mastered' ? t('course.masteredHint') : t('course.masterHint')}</Text>
              </View>
            </Card>
            <SectionHeader title={t('course.practice')} />
            <Button label={t('course.explainNow')} icon="chatbubbles-outline" onPress={() => router.push(`/concept/${p.conceptId}/explain`)} />
            <Button
              label={t('course.reviewCards')}
              icon="albums-outline"
              variant="secondary"
              onPress={() => router.push({ pathname: '/study', params: { conceptId: p.conceptId! } })}
            />
            <Button label={t('course.openConcept')} icon="bulb-outline" variant="ghost" onPress={() => router.push(`/concept/${p.conceptId}`)} />
          </>
        ) : null}

        {next ? (
          <Card onPress={() => router.replace(`/course/${course.id}/${next.key}`)} accessibilityLabel={next.title}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={typography.label}>{t('course.upNext').toLocaleUpperCase()}</Text>
                <Text style={typography.subheading}>{next.title}</Text>
              </View>
              <Ionicons name={t.isRTL ? 'arrow-back' : 'arrow-forward'} size={20} color={colors.primary} />
            </View>
          </Card>
        ) : (
          <Button label={t('course.backToMap')} variant="ghost" icon="map-outline" onPress={() => router.back()} />
        )}
      </Screen>
    </>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  paragraph: { lineHeight: 26 },
  cta: { backgroundColor: colors.primarySoft, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
}));
