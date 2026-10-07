import { useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScoreRing } from '@/components/ScoreRing';
import { Button, Card, Chip, ErrorState, InlineError, LoadingState, Screen } from '@/components/ui';
import { useStartStation, useStation, useWriteStationLesson } from '@/data/courses';
import { useT, type TranslationKey } from '@/i18n';
import { AskButton } from '@/features/lesson/AskSheet';
import { LessonCard } from '@/features/lesson/LessonCard';
import { useAiConfigured } from '@/lib/env';
import { errorMessage } from '@/lib/errors';
import { haptics } from '@/lib/haptics';
import { useReduceMotion } from '@/lib/motion';
import { lessonKey } from '@/local/logic';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

const STEPS: TranslationKey[] = ['lesson.step.read', 'lesson.step.points', 'lesson.step.explain', 'lesson.step.practice'];
const BAR_HEIGHT = 76;

/**
 * One station on the map, in four steps: read the lesson (written by the AI on
 * first visit if it doesn't ship with one), go over the key points, explain it
 * in your own words, and practice its flashcards. Moving past the key points
 * starts the station (adds its concept and cards to the library). Swipe
 * sideways or use the bottom bar to move between steps; its 💬 button opens
 * questions about the lesson at any step.
 */
export default function StationScreen() {
  const { id, key } = useLocalSearchParams<{ id: string; key: string }>();
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const aiReady = useAiConfigured();
  const query = useStation(id, key);
  const start = useStartStation();
  const write = useWriteStationLesson();
  const [step, setStep] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const reduceMotion = useReduceMotion();
  const [slide] = useState(() => new Animated.Value(0));
  // Where the current touch started, to tell a sideways swipe from a tap or a scroll.
  const touch = useRef<{ x: number; y: number } | null>(null);

  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState message={errorMessage(query.error, t)} onRetry={() => void query.refetch()} />;
  const { course, ref, total, next, lesson, progress: p } = query.data;
  const { station, level } = ref;

  const goTo = (target: number, dir = target > step ? 1 : -1) => {
    // Past the key points the station counts as started: its cards join the reviews.
    if (target >= 2 && !p.conceptId) start.mutate({ courseId: course.id, key: station.key }, { onSuccess: () => haptics.success() });
    haptics.tap();
    setStep(target);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    if (!reduceMotion) {
      // The new step slides in from the side it comes from.
      slide.setValue((t.isRTL ? -1 : 1) * dir * 40);
      Animated.timing(slide, { toValue: 0, duration: 180, useNativeDriver: true }).start();
    }
  };
  const onSwipeEnd = (x: number, y: number) => {
    const from = touch.current;
    touch.current = null;
    if (!from || !lesson) return;
    const dx = x - from.x;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(y - from.y) * 2) return;
    // In right-to-left reading the next step comes from the left: drag toward the right.
    const forward = t.isRTL ? dx > 0 : dx < 0;
    const target = step + (forward ? 1 : -1);
    if (target >= 0 && target < STEPS.length) goTo(target, forward ? 1 : -1);
  };
  const goNextStation = () => (next ? router.replace(`/course/${course.id}/${next.key}`) : router.back());
  const last = step === STEPS.length - 1;
  const bottomPad = Math.max(insets.bottom, spacing.md);

  return (
    <>
      <Stack.Screen options={{ title: t('course.station', { n: ref.index + 1 }) }} />
      <View style={{ flex: 1 }}>
        <Animated.View
          style={{ flex: 1, transform: [{ translateX: slide }] }}
          onTouchStart={(e) => {
            touch.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
          }}
          onTouchEnd={(e) => onSwipeEnd(e.nativeEvent.pageX, e.nativeEvent.pageY)}
        >
          <Screen scrollRef={scrollRef} contentStyle={lesson ? { paddingBottom: BAR_HEIGHT + bottomPad + spacing.xl } : undefined}>
            <View style={{ gap: spacing.xs }}>
              <Text style={typography.caption}>
                {course.title} · {t('course.stationOf', { n: ref.index + 1, total })} · {t(`level.${level.key}`)}
              </Text>
              <Text style={typography.title}>{station.title}</Text>
              {step === 0 ? <Text style={[typography.body, { color: colors.textMuted }]}>{station.summary}</Text> : null}
            </View>

            {lesson ? (
              <StepBar step={step} onPick={goTo} />
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

            {lesson && step === 0 ? <LessonCard title={station.title} explanation={lesson.explanation} part="text" /> : null}
            {lesson && step === 1 ? (
              <>
                <Text style={typography.caption}>{t('lesson.pointsIntro')}</Text>
                <LessonCard title={station.title} explanation={lesson.explanation} keyPoints={lesson.cards} part="points" />
              </>
            ) : null}

            {lesson && step === 2 ? (
              <View style={styles.cta}>
                <View style={styles.row}>
                  <Ionicons name="chatbubbles" size={22} color={colors.primary} />
                  <Text style={[typography.heading, { flex: 1 }]}>{t('lesson.explainTitle')}</Text>
                </View>
                <Text style={typography.body}>{t('lesson.explainBody', { title: station.title })}</Text>
                {p.conceptId ? (
                  <Button label={t('course.explainNow')} icon="mic-outline" onPress={() => router.push(`/concept/${p.conceptId}/explain`)} />
                ) : (
                  <LoadingState />
                )}
                <InlineError message={start.error ? errorMessage(start.error, t) : null} />
                {p.conceptId && p.mastery > 0 ? <MasteryCard mastery={p.mastery} mastered={p.status === 'mastered'} /> : null}
              </View>
            ) : null}

            {lesson && step === 3 ? (
              <>
                {p.conceptId ? (
                  <>
                    <MasteryCard mastery={p.mastery} mastered={p.status === 'mastered'} />
                    <Text style={typography.body}>{t('lesson.practiceBody', { count: lesson.cards.length })}</Text>
                    <Button
                      label={t('course.reviewCards')}
                      icon="albums-outline"
                      onPress={() => router.push({ pathname: '/study', params: { conceptId: p.conceptId! } })}
                    />
                    <Button label={t('course.openConcept')} icon="bulb-outline" variant="ghost" onPress={() => router.push(`/concept/${p.conceptId}`)} />
                  </>
                ) : (
                  <LoadingState />
                )}
                {next ? (
                  <Card onPress={goNextStation} accessibilityLabel={next.title}>
                    <View style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={typography.label}>{t('course.upNext').toLocaleUpperCase()}</Text>
                        <Text style={typography.subheading}>{next.title}</Text>
                      </View>
                      <Ionicons name={t.isRTL ? 'arrow-back' : 'arrow-forward'} size={20} color={colors.primary} />
                    </View>
                  </Card>
                ) : null}
              </>
            ) : null}
          </Screen>
        </Animated.View>
        {lesson ? (
          <>
            <View style={[styles.bottom, { paddingBottom: bottomPad }]}>
              {step > 0 ? (
                <Pressable accessibilityRole="button" accessibilityLabel={t('lesson.back')} onPress={() => goTo(step - 1)} style={styles.backBtn} hitSlop={6}>
                  <Ionicons name={t.isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color={colors.primary} />
                </Pressable>
              ) : null}
              <Button
                style={{ flex: 1 }}
                label={last ? (next ? t('lesson.nextStation') : t('course.backToMap')) : t('lesson.nextStep', { step: t(STEPS[step + 1]!) })}
                icon={last ? (next ? 'flag-outline' : 'map-outline') : undefined}
                onPress={() => (last ? goNextStation() : goTo(step + 1))}
              />
              <AskButton
                context={{
                  threadKey: lessonKey(course.id, station.key),
                  conceptTitle: station.title,
                  lesson: lesson.explanation,
                  level: level.key,
                  language: 'he',
                }}
              />
            </View>
          </>
        ) : null}
      </View>
    </>
  );
}

/** The four steps as a segmented progress bar with tappable labels. */
function StepBar({ step, onPick }: { step: number; onPick: (i: number) => void }) {
  const t = useT();
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.steps} accessibilityRole="tablist">
      {STEPS.map((label, i) => (
        <Pressable
          key={label}
          accessibilityRole="tab"
          accessibilityState={{ selected: i === step }}
          aria-selected={i === step}
          accessibilityLabel={t('lesson.stepA11y', { n: i + 1, total: STEPS.length, step: t(label) })}
          onPress={() => onPick(i)}
          style={styles.stepItem}
          hitSlop={4}
        >
          <View style={[styles.stepBar, { backgroundColor: i < step ? colors.success : i === step ? colors.primary : colors.surfaceMuted }]} />
          <Text style={[styles.stepText, { color: i === step ? colors.primary : colors.textMuted }]} numberOfLines={1}>
            {i < step ? '✓ ' : ''}
            {t(label)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function MasteryCard({ mastery, mastered }: { mastery: number; mastered: boolean }) {
  const t = useT();
  const styles = useStyles();
  const { typography } = useTheme();
  return (
    <Card style={styles.status}>
      <ScoreRing score={mastery} size={64} stroke={6} caption={t('concept.mastery')} />
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Chip label={mastered ? t('course.mastered', { score: mastery }) : t('course.inProgress')} tone={mastered ? 'success' : 'warning'} />
        <Text style={typography.caption}>{mastered ? t('course.masteredHint') : t('course.masterHint')}</Text>
      </View>
    </Card>
  );
}

const useStyles = makeStyles(({ colors, textScale }) => ({
  cta: { backgroundColor: colors.primarySoft, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  steps: { flexDirection: 'row', gap: spacing.xs },
  stepItem: { flex: 1, gap: 6, minHeight: 36 },
  stepBar: { height: 6, borderRadius: 3 },
  stepText: { fontSize: Math.round(12 * textScale), fontWeight: '700', textAlign: 'center' },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  backBtn: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
