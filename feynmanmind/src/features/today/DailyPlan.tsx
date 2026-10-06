import { Pressable, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, ProgressBar } from '@/components/ui';
import { useContinueLearning } from '@/data/courses';
import { useWeakConcepts } from '@/data/concepts';
import { useQueueCount } from '@/data/study';
import { useT } from '@/i18n';
import { todayActivity } from '@/local/logic';
import { useDBStore } from '@/local/store';
import { usePrefsStore } from '@/state/prefsStore';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

interface Step {
  key: string;
  title: string;
  detail: string;
  done: boolean;
  href: Href;
}

/**
 * The next step in one big button, then today's checklist (review what's due,
 * learn the next station, explain the weakest concept) under the daily goal.
 */
export function DailyPlan() {
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const db = useDBStore((s) => s.db);
  const goal = usePrefsStore((s) => s.dailyGoalMinutes);
  const due = useQueueCount();
  const next = useContinueLearning().data;
  const weak = useWeakConcepts(1).data?.[0];
  const activity = todayActivity(db, new Date());

  const steps: Step[] = [];
  if (due > 0 || activity.reviews > 0) {
    steps.push({
      key: 'review',
      title: due > 0 ? t.plural('plan.review', due) : t('plan.reviewDone'),
      detail: due > 0 ? t('plan.reviewDetail', { minutes: Math.max(1, Math.round(due / 3)) }) : t('plan.reviewedToday', { count: activity.reviews }),
      done: due === 0,
      href: '/study',
    });
  }
  if (next) {
    steps.push({
      key: 'learn',
      title: t('plan.learn', { title: next.station.title }),
      detail: activity.stationsStarted > 0 ? t('plan.learnDone', { count: activity.stationsStarted }) : `${next.course.title} · ${t('plan.aboutMinutes', { minutes: 5 })}`,
      done: activity.stationsStarted > 0,
      href: `/course/${next.course.id}/${next.station.key}`,
    });
  } else {
    steps.push({ key: 'learn', title: t('plan.pickCourse'), detail: t('plan.pickCourseDetail'), done: false, href: '/learn' });
  }
  if (weak) {
    steps.push({
      key: 'explain',
      title: t('plan.explain', { title: weak.title }),
      detail: activity.explanations > 0 ? t('plan.explainDone') : `${t('plan.mastery', { score: weak.mastery_level })} · ${t('plan.aboutMinutes', { minutes: 3 })}`,
      done: activity.explanations > 0,
      href: `/concept/${weak.id}/explain`,
    });
  }
  const firstOpen = steps.find((s) => !s.done);
  const pct = Math.min(1, activity.minutes / Math.max(1, goal));

  return (
    <View style={{ gap: spacing.md }}>
      {firstOpen ? (
        <View style={styles.hero}>
          <Text style={[typography.label, styles.heroSub]}>{t('plan.nextStep').toLocaleUpperCase()}</Text>
          <Text style={[typography.heading, styles.heroText]}>{firstOpen.title}</Text>
          <Text style={[typography.caption, styles.heroSub]}>{firstOpen.detail}</Text>
          <Button label={t('plan.startNow')} icon="play" variant="secondary" onPress={() => router.push(firstOpen.href)} style={{ marginTop: spacing.sm }} />
        </View>
      ) : (
        <View style={[styles.hero, { backgroundColor: colors.success }]}>
          <Ionicons name="trophy" size={28} color={colors.onPrimary} />
          <Text style={[typography.heading, styles.heroText]}>{t('plan.allDone')}</Text>
          <Text style={[typography.caption, styles.heroSub]}>{t('plan.allDoneBody')}</Text>
        </View>
      )}

      <View style={styles.card}>
        <View style={styles.row} accessible accessibilityLabel={t('plan.goalA11y', { minutes: activity.minutes, goal })}>
          <Text style={[typography.label, { flex: 1 }]}>{t('plan.myDay').toLocaleUpperCase()}</Text>
          <Text style={[typography.caption, { fontWeight: '700' }]}>{t('plan.minutesOf', { minutes: activity.minutes, goal })}</Text>
        </View>
        <ProgressBar value={pct} color={colors.success} height={8} />
        <Text style={typography.caption}>{pct >= 1 ? t('plan.goalDone') : t('plan.goalLeft', { minutes: Math.max(0, goal - activity.minutes) })}</Text>
        {steps.map((step) => (
          <Pressable
            key={step.key}
            accessibilityRole="button"
            accessibilityLabel={`${step.title}. ${step.detail}`}
            accessibilityState={{ checked: step.done }}
            onPress={() => router.push(step.href)}
            style={({ pressed }) => [styles.step, pressed && { opacity: 0.7 }]}
          >
            <View style={[styles.check, step.done && { backgroundColor: colors.success, borderColor: colors.success }]}>
              {step.done ? <Ionicons name="checkmark" size={16} color={colors.onPrimary} /> : null}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[typography.body, { fontWeight: '600' }, step.done && { color: colors.textMuted, textDecorationLine: 'line-through' }]} numberOfLines={2}>
                {step.title}
              </Text>
              <Text style={typography.caption} numberOfLines={1}>
                {step.detail}
              </Text>
            </View>
            {step === firstOpen ? <Text style={[typography.caption, { color: colors.primary, fontWeight: '800' }]}>{t('plan.now')}</Text> : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  hero: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs },
  heroText: { color: colors.onPrimary },
  heroSub: { color: colors.onPrimary, opacity: 0.88 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 52, paddingVertical: spacing.xs },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
}));
