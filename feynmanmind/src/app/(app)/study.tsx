import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, EmptyState, ErrorState, IconButton, InlineError, LoadingState, ProgressBar, Screen } from '@/components/ui';
import { keys } from '@/data/keys';
import { confirmAsync } from '@/lib/dialogs';
import { useDeleteFlashcard } from '@/data/flashcards';
import { useDueCards, useReviewCard } from '@/data/study';
import { useT } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { formatInterval } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { previewIntervals, QUALITY_OPTIONS } from '@/srs/qualities';
import { summarizeSession } from '@/srs/session';
import type { QualityScore } from '@/srs/sm2';
import { SketchBorder } from '@/components/sketch';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

export default function StudyScreen() {
  const { conceptId, subjectId, filter } = useLocalSearchParams<{ conceptId?: string; subjectId?: string; filter?: 'hard' }>();
  const t = useT();
  const styles = useStyles();
  const { colors, typography, look } = useTheme();
  const qc = useQueryClient();
  const due = useDueCards({ conceptId, subjectId, hardOnly: filter === 'hard' });
  const review = useReviewCard();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [grades, setGrades] = useState<QualityScore[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  // Cards deleted during the session ("I don't need this card"); the next one takes their place.
  const [dropped, setDropped] = useState<Set<string>>(() => new Set());
  const remove = useDeleteFlashcard();

  const cards = (due.data ?? []).filter((c) => !dropped.has(c.id));
  const card = cards[index];
  const finished = due.isSuccess && index >= cards.length;

  // Refresh everything that depends on review state once the session ends or closes.
  useEffect(
    () => () => {
      qc.invalidateQueries({ queryKey: ['due'] });
      qc.invalidateQueries({ queryKey: keys.stats });
      qc.invalidateQueries({ queryKey: ['cards'] });
    },
    [qc],
  );

  const grade = async (quality: QualityScore) => {
    if (!card || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await review.mutateAsync({ cardId: card.id, quality });
      setGrades((g) => [...g, quality]);
    } catch (e) {
      setError(e);
      setSubmitting(false);
      return;
    }
    if (quality >= 3) haptics.success();
    else haptics.warning();
    setRevealed(false);
    setIndex((i) => i + 1);
    setSubmitting(false);
  };

  const drop = async () => {
    if (!card) return;
    const ok = await confirmAsync({
      title: t('concept.deleteCard.title'),
      message: t('review.dropCardBody'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    await remove.mutateAsync(card.id);
    setDropped((d) => new Set(d).add(card.id));
    setRevealed(false);
  };

  const close = () => router.back();
  const header = <Stack.Screen options={{ headerLeft: () => <IconButton icon="close" label={t('study.close')} onPress={close} color={colors.primary} /> }} />;

  if (due.isPending) return <>{header}<LoadingState /></>;
  if (due.isError) return <>{header}<ErrorState message={errorMessage(due.error, t)} onRetry={() => void due.refetch()} /></>;

  if (cards.length === 0) {
    return (
      <>
        {header}
        <Screen contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
          <EmptyState icon="checkmark-done-circle-outline" title={t('study.emptyTitle')} body={t('study.emptyBody')} action={<Button label={t('study.close')} onPress={close} />} />
        </Screen>
      </>
    );
  }

  if (finished || !card) {
    const summary = summarizeSession(grades);
    return (
      <>
        {header}
        <Screen contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
          <EmptyState
            icon="trophy-outline"
            title={t('study.doneTitle')}
            body={[t.plural('study.doneBody', summary.reviewed), summary.recallPct !== null ? t('study.recall', { pct: summary.recallPct }) : '']
              .filter(Boolean)
              .join(' ')}
            action={<Button label={t('common.done')} onPress={close} />}
          />
        </Screen>
      </>
    );
  }

  const intervals = previewIntervals(card.review);

  return (
    <>
      {header}
      <Screen>
        <View style={styles.progressRow}>
          <ProgressBar value={index / cards.length} />
          <Text style={typography.caption}>{t('study.progress', { current: index + 1, total: cards.length })}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={revealed ? card.answer : t('study.showAnswer')}
          disabled={revealed}
          onPress={() => {
            haptics.tap();
            setRevealed(true);
          }}
          style={styles.card}
        >
          {look === 'paper' ? <IndexCardLines /> : null}
          {look === 'chalk' ? <SketchBorder color="rgba(238,240,232,0.8)" seed={index + 3} radius={16} width={2.6} /> : null}
          <Text style={typography.label}>{look === 'classic' ? t('study.question').toLocaleUpperCase() : t('study.question')}</Text>
          <Text style={[typography.heading, styles.cardText]}>{card.question}</Text>
          {revealed ? (
            <>
              <View style={styles.divider} />
              <Text style={typography.label}>{look === 'classic' ? t('study.answer').toLocaleUpperCase() : t('study.answer')}</Text>
              <Text style={[typography.body, styles.cardText, styles.answer]} selectable>
                {card.answer}
              </Text>
            </>
          ) : (
            <View style={styles.tapHint}>
              <Ionicons name="eye-outline" size={18} color={colors.textMuted} />
              <Text style={typography.caption}>{t('study.showAnswer')}</Text>
            </View>
          )}
        </Pressable>

        <InlineError message={error ? errorMessage(error, t) : null} />

        {revealed ? (
          <View style={{ gap: spacing.sm }}>
            <Text style={[typography.subheading, { textAlign: 'center' }]}>{t('study.howWell')}</Text>
            <View style={styles.grid}>
              {QUALITY_OPTIONS.map((o) => {
                const bg = { danger: colors.dangerSoft, warning: colors.warningSoft, success: colors.successSoft }[o.tone];
                const fg = { danger: colors.danger, warning: colors.warning, success: colors.success }[o.tone];
                return (
                  <Pressable
                    key={o.quality}
                    accessibilityRole="button"
                    accessibilityLabel={`${t(o.label)}, ${t(o.hint)}, ${formatInterval(intervals[o.quality], t)}`}
                    disabled={submitting}
                    onPress={() => void grade(o.quality)}
                    style={({ pressed }) => [
                      styles.grade,
                      look === 'classic' ? { backgroundColor: bg } : look === 'paper' ? { borderColor: fg, backgroundColor: colors.surface } : null,
                      { opacity: submitting ? 0.5 : pressed ? 0.8 : 1 },
                    ]}
                  >
                    {look === 'chalk' ? <SketchBorder color={fg} seed={o.quality * 17 + 1} radius={12} /> : null}
                    <Text style={[styles.gradeLabel, { color: fg }]}>{t(o.label)}</Text>
                    <Text style={[typography.caption, styles.center]} numberOfLines={2}>
                      {t(o.hint)}
                    </Text>
                    <Text style={[typography.caption, styles.center, { fontWeight: '700' }]}>{formatInterval(intervals[o.quality], t)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : (
          <Button label={t('study.showAnswer')} onPress={() => setRevealed(true)} />
        )}
        <Button label={t('review.dropCard')} icon="trash-outline" variant="ghost" onPress={() => void drop()} />
      </Screen>
    </>
  );
}

/** The ruling of an index card: a red line under the heading, then faint blue lines, drawn to the card's height. */
function IndexCardLines() {
  const [height, setHeight] = useState(0);
  const lines = Math.max(0, Math.floor((height - INDEX_FIRST) / INDEX_GAP));
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      <View style={[indexStyles.line, { top: INDEX_FIRST - 14, height: 1.5, backgroundColor: 'rgba(196,72,60,0.55)' }]} />
      {Array.from({ length: lines }, (_, i) => (
        <View key={i} style={[indexStyles.line, { top: INDEX_FIRST + (i + 1) * INDEX_GAP - 6 }]} />
      ))}
    </View>
  );
}
const INDEX_FIRST = 62;
const INDEX_GAP = 30;
const indexStyles = StyleSheet.create({
  line: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(110,140,175,0.35)' },
});

const useStyles = makeStyles(({ colors, look }) => ({
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  // Classic: a plain card. Paper: an index card, slightly askew. Chalk: a small slate.
  card:
    look === 'paper'
      ? { backgroundColor: '#FFFEFA', borderRadius: 3, padding: spacing.xl, paddingTop: spacing.lg, gap: spacing.md, minHeight: 280, boxShadow: '0px 2px 0px #E1D3B4, 0px 10px 22px rgba(90,60,20,0.16)', transform: [{ rotate: '-0.7deg' }] }
      : look === 'chalk'
        ? { backgroundColor: 'rgba(0,0,0,0.16)', borderRadius: 16, padding: spacing.xl, gap: spacing.md, minHeight: 280 }
        : { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.xl, gap: spacing.md, minHeight: 260 },
  cardText: { lineHeight: look === 'paper' ? 30 : 28 },
  // On paper the answer is in fountain-pen blue.
  answer: look === 'paper' ? { color: colors.ink } : {},
  divider: look === 'paper' ? { height: 0, marginVertical: spacing.xs } : { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  tapHint: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 'auto', alignSelf: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  grade: {
    width: '31.5%',
    flexGrow: 1,
    borderRadius: look === 'paper' ? 3 : radius.md,
    borderWidth: look === 'paper' ? 1.5 : 0,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    gap: 2,
  },
  gradeLabel: { fontSize: 16, fontWeight: '800' },
  center: { textAlign: 'center' },
}));
