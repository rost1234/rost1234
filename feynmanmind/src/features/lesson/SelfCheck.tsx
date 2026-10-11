import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Card, InlineError, LoadingState, Screen, TextField } from '@/components/ui';
import type { CourseConcept, LevelKey } from '@/content/types';
import { useStartStation } from '@/data/courses';
import { useSelfCheck } from '@/data/imports';
import { useT } from '@/i18n';
import { useAiConfigured } from '@/lib/env';
import { errorMessage } from '@/lib/errors';
import { haptics } from '@/lib/haptics';
import { KeyboardInsetView } from '@/lib/keyboard';
import type { StationProgress } from '@/local/logic';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

interface Props {
  courseId: string;
  courseTitle: string;
  station: CourseConcept & { reference: string };
  index: number;
  total: number;
  levelKey: LevelKey;
  next: CourseConcept | null;
  progress: StationProgress;
}

/**
 * An imported lesson: the concept's name only, explain it in your own words,
 * then the reference (and its key points) is revealed to compare against and
 * you rate yourself 1–5. The rating becomes the concept's mastery; the AI
 * tutor is optional, with the reference as its ground truth.
 */
export function SelfCheckStation({ courseId, courseTitle, station, index, total, next, progress: p }: Props) {
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const aiReady = useAiConfigured();
  const start = useStartStation();
  const save = useSelfCheck();
  const [text, setText] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [covered, setCovered] = useState<boolean[]>([]);
  const [rating, setRating] = useState(0);
  const [saved, setSaved] = useState<number | null>(null);
  const points = station.keyPoints ?? [];

  const reveal = () => {
    haptics.tap();
    setRevealed(true);
    if (!p.conceptId) start.mutate({ courseId, key: station.key });
  };
  const again = () => {
    setRevealed(false);
    setSaved(null);
    setRating(0);
    setCovered([]);
    setText('');
  };
  const conceptId = p.conceptId ?? start.data;
  const submit = () => {
    if (!conceptId || !rating) return;
    save.mutate(
      { conceptId, explanation: text.trim(), rating },
      {
        onSuccess: () => {
          haptics.success();
          setSaved(rating * 20);
        },
      },
    );
  };
  const goNext = () => (next ? router.replace(`/course/${courseId}/${next.key}`) : router.back());

  return (
    <>
      <Stack.Screen options={{ title: t('course.station', { n: index + 1 }) }} />
      <KeyboardInsetView safeBottom={false}>
        <Screen>
          <View style={{ gap: spacing.xs }}>
            <Text style={typography.caption}>
              {courseTitle} · {t('course.stationOf', { n: index + 1, total })} · {station.unit ?? station.summary}
            </Text>
            <Text style={typography.title}>{station.title}</Text>
          </View>
          <View style={styles.steps}>
            {(['self.step.explain', 'self.step.compare'] as const).map((k, i) => {
              const on = i === (revealed ? 1 : 0);
              const done = i === 0 && revealed;
              return (
                <View key={k} style={styles.stepItem}>
                  <View style={[styles.stepBar, { backgroundColor: done ? colors.success : on ? colors.primary : colors.surfaceMuted }]} />
                  <Text style={[styles.stepText, { color: on ? colors.primary : colors.textMuted }]}>
                    {done ? '✓ ' : ''}
                    {t(k)}
                  </Text>
                </View>
              );
            })}
          </View>

          {!revealed ? (
            <>
              <Text style={typography.body}>{t('self.prompt', { title: station.title })}</Text>
              {p.mastery > 0 ? <Text style={typography.caption}>{t('self.last', { score: p.mastery })}</Text> : null}
              <TextField
                value={text}
                onChangeText={setText}
                placeholder={t('self.placeholder')}
                accessibilityLabel={t('lesson.explainTitle')}
                multiline
                style={{ minHeight: 180 }}
                testID="self-explanation"
              />
              <Button label={text.trim() ? t('self.reveal') : t('self.revealEmpty')} icon="eye-outline" variant={text.trim() ? 'primary' : 'secondary'} onPress={reveal} />
            </>
          ) : (
            <>
              {text.trim() ? (
                <Card style={{ gap: spacing.xs }}>
                  <Text style={typography.label}>{t('self.mine').toLocaleUpperCase()}</Text>
                  <Text style={typography.body}>{text.trim()}</Text>
                  {saved === null ? <Button label={t('self.edit')} variant="ghost" icon="create-outline" onPress={() => setRevealed(false)} /> : null}
                </Card>
              ) : null}
              <View style={styles.reference} testID="self-reference">
                <Text style={[typography.label, { color: colors.primary }]}>{t('self.reference').toLocaleUpperCase()}</Text>
                <Text style={typography.body}>{station.reference}</Text>
              </View>
              {points.length ? (
                <Card style={{ padding: 0, gap: 0 }}>
                  <Text style={[typography.subheading, styles.pointsHead]}>{t('self.keyPoints')}</Text>
                  {points.map((point, i) => (
                    <Pressable
                      key={i}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: !!covered[i] }}
                      onPress={() => setCovered((c) => Object.assign([...c], { [i]: !c[i] }))}
                      style={styles.point}
                    >
                      <Ionicons name={covered[i] ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={covered[i] ? colors.success : colors.border} />
                      <Text style={[typography.body, { flex: 1 }]}>{point}</Text>
                    </Pressable>
                  ))}
                  <Text style={[typography.caption, styles.pointsHead]}>{t('self.keyPointsCount', { n: covered.filter(Boolean).length, total: points.length })}</Text>
                </Card>
              ) : null}

              {start.isPending ? <LoadingState /> : null}
              <InlineError message={start.error ? errorMessage(start.error, t) : save.error ? errorMessage(save.error, t) : null} />

              {saved === null ? (
                <Card style={{ gap: spacing.sm }}>
                  <Text style={typography.subheading}>{t('self.rate')}</Text>
                  <View style={styles.stars} accessibilityRole="adjustable" accessibilityLabel={t('print.starsA11y', { n: rating })}>
                    {[1, 2, 3, 4, 5].map((k) => (
                      <Pressable key={k} onPress={() => setRating(k)} hitSlop={6} accessibilityRole="button" accessibilityLabel={t('print.starsA11y', { n: k })}>
                        <Ionicons name={k <= rating ? 'star' : 'star-outline'} size={36} color={k <= rating ? colors.accent : colors.textMuted} />
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.scale}>
                    <Text style={typography.caption}>{t('self.rate.1')}</Text>
                    <Text style={typography.caption}>{t('self.rate.5')}</Text>
                  </View>
                  <Button label={t('self.save')} icon="checkmark-done-outline" onPress={submit} disabled={!rating || !conceptId || save.isPending} />
                </Card>
              ) : (
                <Card style={{ gap: spacing.sm, borderColor: saved >= 80 ? colors.success : colors.border }}>
                  <Text style={typography.subheading}>✓ {t('self.saved', { score: saved })}</Text>
                  <Button label={next ? t('lesson.nextStation') : t('course.backToMap')} icon={next ? 'flag-outline' : 'map-outline'} onPress={goNext} />
                  <Button label={t('self.again')} icon="refresh-outline" variant="secondary" onPress={again} />
                </Card>
              )}
              {aiReady && conceptId ? (
                <Button label={t('self.tutor')} icon="chatbubbles-outline" variant="ghost" onPress={() => router.push(`/concept/${conceptId}/explain`)} />
              ) : null}
            </>
          )}
        </Screen>
      </KeyboardInsetView>
    </>
  );
}

const useStyles = makeStyles(({ colors, textScale }) => ({
  steps: { flexDirection: 'row', gap: spacing.xs },
  stepItem: { flex: 1, gap: 6 },
  stepBar: { height: 6, borderRadius: 3 },
  stepText: { fontSize: Math.round(12 * textScale), fontWeight: '700', textAlign: 'center' },
  reference: { backgroundColor: colors.primarySoft, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  pointsHead: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  point: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  scale: { flexDirection: 'row', justifyContent: 'space-between' },
}));
