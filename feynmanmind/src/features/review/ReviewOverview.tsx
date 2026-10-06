import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BarChart } from '@/components/BarChart';
import { ChoiceChips } from '@/components/ChoiceChips';
import { Button, SectionHeader } from '@/components/ui';
import { queueOptions, useQueueCount, useStudyStats, useWeek } from '@/data/study';
import { ReviewCalendar } from '@/features/home/ReviewCalendar';
import { useT } from '@/i18n';
import { reviewQueue } from '@/local/logic';
import { useDBStore } from '@/local/store';
import { usePrefsStore } from '@/state/prefsStore';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

/** The number waiting and one button to start, with the reason when it's zero. */
export function ReviewHero() {
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const s = useStudyStats().data;
  const due = useQueueCount();
  const minutes = Math.max(1, Math.round(due / 3));
  const limited = due === 0 && (s?.due_now ?? 0) > 0;
  return (
    <View style={styles.hero}>
      <View style={styles.heroTop} accessible accessibilityLabel={due ? `${t.plural('today.due', due)}, ${t('review.aboutMinutes', { minutes })}` : undefined}>
        <Text style={[styles.big, { color: due ? colors.primary : colors.success }]}>{due}</Text>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={typography.subheading}>
            {due ? t('review.waiting') : limited ? t('review.limitReached') : t('today.caughtUp')}
          </Text>
          <Text style={typography.caption}>
            {due
              ? t('review.aboutMinutes', { minutes }) + (s && s.due_today > s.due_now ? ` · ${t('today.dueLater', { count: s.due_today - s.due_now })}` : '')
              : limited
                ? t('review.limitReachedBody', { count: s!.due_now })
                : t('today.caughtUpBody')}
          </Text>
        </View>
      </View>
      {due ? <Button label={t('today.startReview')} icon="play" onPress={() => router.push('/study')} /> : null}
    </View>
  );
}

type Focus = 'all' | 'hard' | `s:${string}`;

/** Quick filters: everything, one subject, or only the cards you find hard. */
export function ReviewFilters() {
  const t = useT();
  const db = useDBStore((s) => s.db);
  // Re-render when the limits change (one selector each: a selector returning a new array loops).
  usePrefsStore((s) => s.newCardsPerDay);
  usePrefsStore((s) => s.maxReviewsPerDay);
  usePrefsStore((s) => s.reviewOrder);
  const now = new Date();
  const all = reviewQueue(db, now, queueOptions({})).length;
  const hard = reviewQueue(db, now, queueOptions({ hardOnly: true })).length;
  const subjects = Object.values(db.subjects)
    .map((s) => ({ id: s.id, title: s.title, count: reviewQueue(db, now, queueOptions({ subjectId: s.id })).length }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count);
  if (!hard && subjects.length < 2) return null;

  const open = (f: Focus) => {
    if (f === 'all') router.push('/study');
    else if (f === 'hard') router.push({ pathname: '/study', params: { filter: 'hard' } });
    else router.push({ pathname: '/study', params: { subjectId: f.slice(2) } });
  };
  return (
    <ChoiceChips<Focus>
      label={t('review.focusTitle')}
      onChange={open}
      options={[
        { value: 'all', label: t('review.focusAll', { count: all }) },
        ...(subjects.length > 1 ? subjects.map((s) => ({ value: `s:${s.id}` as Focus, label: `${s.title} · ${s.count}` })) : []),
        ...(hard ? [{ value: 'hard' as Focus, label: t('review.focusHard', { count: hard }) }] : []),
      ]}
    />
  );
}

/** This week at a glance (green = reviewed, number = cards due); opens into the full month. */
export function WeekStrip() {
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const week = useWeek();
  const [month, setMonth] = useState(false);
  return (
    <>
      <SectionHeader
        title={t('review.thisWeek')}
        action={
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: month }} onPress={() => setMonth((m) => !m)} hitSlop={8} style={styles.link}>
            <Text style={[typography.caption, { color: colors.primary, fontWeight: '800' }]}>{month ? t('review.hideMonth') : t('review.showMonth')}</Text>
            <Ionicons name={month ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
          </Pressable>
        }
      />
      {month ? (
        <ReviewCalendar />
      ) : (
        <View style={styles.week}>
          {week.map((d) => {
            const date = new Date(`${d.date}T12:00:00`);
            const label = date.toLocaleDateString(t.locale, { weekday: 'narrow' });
            const a11y = date.toLocaleDateString(t.locale, { weekday: 'long', day: 'numeric', month: 'long' });
            return (
              <View
                key={d.date}
                accessible
                accessibilityLabel={d.isPast || d.isToday ? `${a11y}: ${t('review.dayReviewed', { count: d.reviewed })}` : `${a11y}: ${t('review.dayDue', { count: d.due })}`}
                style={[
                  styles.day,
                  d.reviewed > 0 && { backgroundColor: colors.successSoft, borderColor: colors.successSoft },
                  d.isToday && { borderColor: colors.primary, borderWidth: 2 },
                ]}
              >
                <Text style={[typography.caption, { fontWeight: '700' }]}>{label}</Text>
                <Text style={[styles.dayNum, d.isToday && { color: colors.primary }]}>{date.getDate()}</Text>
                <Text style={[styles.dayDue, { color: d.reviewed > 0 ? colors.success : colors.primary }]}>
                  {d.reviewed > 0 ? '✓' : !d.isPast && d.due > 0 ? d.due : ' '}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </>
  );
}

/** Cards coming due over the next 7 days. */
export function Forecast() {
  const t = useT();
  const styles = useStyles();
  const s = useStudyStats().data;
  if (!s || s.total_cards === 0) return null;
  return (
    <>
      <SectionHeader title={t('review.forecast')} />
      <View style={styles.card}>
        <BarChart
          accessibilityLabel={t('review.forecast')}
          height={80}
          bars={s.forecast.map((f, i) => ({
            key: f.date,
            label: i === 0 ? t('review.today') : new Date(`${f.date}T12:00:00`).toLocaleDateString(t.locale, { weekday: 'narrow' }),
            value: f.count,
            highlight: i === 0,
          }))}
        />
      </View>
    </>
  );
}

const useStyles = makeStyles(({ colors, textScale }) => ({
  hero: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  big: { fontSize: Math.round(52 * textScale), fontWeight: '800', lineHeight: Math.round(58 * textScale) },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 32 },
  week: { flexDirection: 'row', gap: 6 },
  day: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 2,
  },
  dayNum: { color: colors.text, fontSize: Math.round(16 * textScale), fontWeight: '800' },
  dayDue: { fontSize: Math.round(12 * textScale), fontWeight: '800' },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md },
}));
