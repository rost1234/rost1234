import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SectionHeader } from '@/components/ui';
import { queueOptions } from '@/data/study';
import { useT } from '@/i18n';
import { reviewQueue } from '@/local/logic';
import { useDBStore } from '@/local/store';
import { usePrefsStore } from '@/state/prefsStore';
import { makeStyles, radius, spacing } from '@/theme';

/** Quick-start chips: review only one subject, or only the cards you find hard. */
export function FocusedReview() {
  const t = useT();
  const styles = useStyles();
  const db = useDBStore((s) => s.db);
  // Re-render when the limits change (one selector each: a selector returning a new array loops).
  usePrefsStore((s) => s.newCardsPerDay);
  usePrefsStore((s) => s.maxReviewsPerDay);
  usePrefsStore((s) => s.reviewOrder);
  const now = new Date();

  const hard = reviewQueue(db, now, queueOptions({ hardOnly: true })).length;
  const subjects = Object.values(db.subjects)
    .map((s) => ({ id: s.id, title: s.title, count: reviewQueue(db, now, queueOptions({ subjectId: s.id })).length }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count);
  if (!hard && subjects.length < 2) return null;

  return (
    <View style={{ gap: spacing.sm }}>
      <SectionHeader title={t('review.focusTitle')} />
      <View style={styles.chips}>
        {hard ? (
          <Chip label={t('review.focusHard', { count: hard })} onPress={() => router.push({ pathname: '/study', params: { filter: 'hard' } })} />
        ) : null}
        {subjects.length > 1
          ? subjects.map((s) => (
              <Chip key={s.id} label={`${s.title} · ${s.count}`} onPress={() => router.push({ pathname: '/study', params: { subjectId: s.id } })} />
            ))
          : null}
      </View>
    </View>
  );
}

function Chip({ label, onPress }: { label: string; onPress: () => void }) {
  const styles = useStyles();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}>
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors, textScale }) => ({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    minHeight: 40,
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  chipText: { color: colors.primary, fontWeight: '700', fontSize: Math.round(14 * textScale) },
}));
