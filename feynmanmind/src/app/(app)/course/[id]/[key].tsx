import { Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScoreRing } from '@/components/ScoreRing';
import { Button, Card, Chip, ErrorState, LoadingState, Screen, SectionHeader } from '@/components/ui';
import { useCourse, useStartStation } from '@/data/courses';
import { useT } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { haptics } from '@/lib/haptics';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

/**
 * One station on the map: read the lesson, then start it (adds the concept
 * and its flashcards to the library), explain it in your own words, review.
 */
export default function StationScreen() {
  const { id, key } = useLocalSearchParams<{ id: string; key: string }>();
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const query = useCourse(id);
  const start = useStartStation();

  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState message={errorMessage(query.error, t)} onRetry={() => void query.refetch()} />;
  const { course, progress } = query.data;
  const index = course.concepts.findIndex((c) => c.key === key);
  const station = course.concepts[index];
  if (!station) return <ErrorState message={t('error.notFound')} />;
  const p = progress.stations[index]!;
  const next = course.concepts[index + 1];

  const begin = () =>
    start.mutate(
      { courseId: course.id, key: station.key },
      { onSuccess: () => haptics.success() },
    );

  return (
    <>
      <Stack.Screen options={{ title: t('course.station', { n: index + 1 }) }} />
      <Screen>
        <View style={{ gap: spacing.xs }}>
          <Text style={typography.caption}>
            {course.title} · {t('course.stationOf', { n: index + 1, total: course.concepts.length })}
          </Text>
          <Text style={typography.title}>{station.title}</Text>
          <Text style={[typography.body, { color: colors.textMuted }]}>{station.summary}</Text>
        </View>

        <Card>
          {station.explanation.split(/\n\s*\n/).map((paragraph, i) => (
            <Text key={i} style={[typography.body, styles.paragraph]} selectable>
              {paragraph.trim()}
            </Text>
          ))}
        </Card>

        {p.status === 'new' ? (
          <View style={styles.cta}>
            <Text style={typography.body}>{t('course.startBody', { count: station.cards.length })}</Text>
            <Button label={t('course.startStation')} icon="flag-outline" onPress={begin} loading={start.isPending} />
          </View>
        ) : (
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
        )}
        <InlineStartError error={start.error} />

        {next ? (
          <Card onPress={() => router.replace(`/course/${course.id}/${next.key}`)} accessibilityLabel={next.title}>
            <View style={styles.nextRow}>
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

function InlineStartError({ error }: { error: unknown }) {
  const t = useT();
  const { colors, typography } = useTheme();
  if (!error) return null;
  return <Text style={[typography.caption, { color: colors.danger }]}>{errorMessage(error, t)}</Text>;
}

const useStyles = makeStyles(({ colors }) => ({
  paragraph: { lineHeight: 26 },
  cta: { backgroundColor: colors.primarySoft, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
}));
