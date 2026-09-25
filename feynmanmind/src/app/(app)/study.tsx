import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, EmptyState, ErrorState, IconButton, InlineError, LoadingState, ProgressBar, Screen } from '@/components/ui';
import { keys } from '@/data/keys';
import { useDueCards, useReviewCard } from '@/data/study';
import { useT } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { formatInterval } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { previewIntervals, QUALITY_OPTIONS } from '@/srs/qualities';
import { summarizeSession } from '@/srs/session';
import type { QualityScore } from '@/srs/sm2';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

export default function StudyScreen() {
  const { conceptId } = useLocalSearchParams<{ conceptId?: string }>();
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const qc = useQueryClient();
  const due = useDueCards(conceptId);
  const review = useReviewCard();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [grades, setGrades] = useState<QualityScore[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const cards = due.data ?? [];
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
          <Text style={typography.label}>{t('study.question').toLocaleUpperCase()}</Text>
          <Text style={[typography.heading, styles.cardText]}>{card.question}</Text>
          {revealed ? (
            <>
              <View style={styles.divider} />
              <Text style={typography.label}>{t('study.answer').toLocaleUpperCase()}</Text>
              <Text style={[typography.body, styles.cardText]} selectable>
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
                    style={({ pressed }) => [styles.grade, { backgroundColor: bg, opacity: submitting ? 0.5 : pressed ? 0.8 : 1 }]}
                  >
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
      </Screen>
    </>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
    minHeight: 260,
  },
  cardText: { lineHeight: 28 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  tapHint: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 'auto', alignSelf: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  grade: { width: '31.5%', flexGrow: 1, borderRadius: radius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.xs, alignItems: 'center', gap: 2 },
  gradeLabel: { fontSize: 16, fontWeight: '800' },
  center: { textAlign: 'center' },
}));
