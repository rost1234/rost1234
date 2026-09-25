import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Card, Chip, EmptyState, ErrorState, LoadingState, ProgressBar, Screen } from '@/components/ui';
import { useCourse, useSavePlacement } from '@/data/courses';
import { useT } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { haptics } from '@/lib/haptics';
import { shuffledIndices } from '@/lib/shuffle';
import { finishPlacementLevel, passesLevel, startPlacement, type PlacementState } from '@/local/logic';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

/**
 * Adaptive placement test: a few questions per level, bottom-up. Pass a level
 * (2 of 3) to move up; the first level you don't pass is where you start.
 */
export default function PlacementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const query = useCourse(id);
  const save = useSavePlacement();
  const [state, setState] = useState<PlacementState>(startPlacement);
  const [question, setQuestion] = useState(0);
  const [correct, setCorrect] = useState(0);

  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState message={errorMessage(query.error, t)} onRetry={() => void query.refetch()} />;
  const { course } = query.data;
  const level = course.levels[state.levelIndex];

  if (!level || level.quiz.length === 0) {
    return <EmptyState icon="help-circle-outline" title={t('placement.none')} body="" action={<Button label={t('common.done')} onPress={() => router.back()} />} />;
  }

  if (state.done) {
    const placed = course.levels[state.resultLevel]!;
    return (
      <>
        <Stack.Screen options={{ title: t('placement.title') }} />
        <Screen>
          <View style={styles.result}>
            <Ionicons name="locate" size={48} color={colors.primary} />
            <Text style={[typography.caption, styles.center]}>{t('placement.resultIntro')}</Text>
            <Text style={[typography.title, styles.center]}>{t(`level.${placed.key}`)}</Text>
            <Text style={[typography.body, styles.center, { color: colors.textMuted }]}>
              {state.resultLevel === 0 ? t('placement.resultStart') : t('placement.resultSkip')}
            </Text>
          </View>
          <Card>
            {state.scores.map((score, i) => {
              const lvl = course.levels[i]!;
              const passed = passesLevel(score, lvl.quiz.length);
              return (
                <View key={lvl.key} style={styles.scoreRow}>
                  <Ionicons name={passed ? 'checkmark-circle' : 'close-circle'} size={20} color={passed ? colors.success : colors.danger} />
                  <Text style={[typography.body, { flex: 1 }]}>{t(`level.${lvl.key}`)}</Text>
                  <Text style={typography.caption}>{t('placement.score', { correct: score, total: lvl.quiz.length })}</Text>
                </View>
              );
            })}
          </Card>
          <Button label={t('placement.toMap')} icon="map-outline" onPress={() => router.back()} />
        </Screen>
      </>
    );
  }

  const q = level.quiz[question]!;
  const order = shuffledIndices(q.options.length, q.question);
  const answered = state.scores.reduce((n, _s, i) => n + course.levels[i]!.quiz.length, 0) + question;

  const answer = (isCorrect: boolean) => {
    haptics.tap();
    const total = correct + (isCorrect ? 1 : 0);
    if (question + 1 < level.quiz.length) {
      setCorrect(total);
      setQuestion(question + 1);
      return;
    }
    const next = finishPlacementLevel(course, state, total);
    setState(next);
    setQuestion(0);
    setCorrect(0);
    if (next.done) save.mutate({ courseId: course.id, state: next }, { onSuccess: () => haptics.success() });
  };

  return (
    <>
      <Stack.Screen options={{ title: t('placement.title') }} />
      <Screen>
        <View style={styles.progress}>
          <Chip label={t(`level.${level.key}`)} tone="primary" />
          <Text style={typography.caption}>{t('placement.questionOf', { n: question + 1, total: level.quiz.length })}</Text>
        </View>
        <ProgressBar value={answered / Math.max(1, course.levels.reduce((n, l) => n + l.quiz.length, 0))} height={6} />
        <Text style={typography.heading}>{q.question}</Text>
        <View style={{ gap: spacing.sm }}>
          {order.map((optionIndex) => (
            <Pressable
              key={`${q.question}-${optionIndex}`}
              accessibilityRole="button"
              onPress={() => answer(optionIndex === q.correct)}
              style={({ pressed }) => [styles.option, pressed && { backgroundColor: colors.primarySoft }]}
            >
              <Text style={typography.body}>{q.options[optionIndex]}</Text>
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" onPress={() => answer(false)} style={({ pressed }) => [styles.option, styles.dontKnow, pressed && { opacity: 0.7 }]}>
            <Text style={[typography.body, { color: colors.textMuted }]}>{t('placement.dontKnow')}</Text>
          </Pressable>
        </View>
        <Text style={[typography.caption, styles.center]}>{t('placement.honest')}</Text>
      </Screen>
    </>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  progress: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  option: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  dontKnow: { borderStyle: 'dashed' },
  result: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  center: { textAlign: 'center' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs },
}));
