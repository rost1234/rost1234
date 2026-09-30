import { Pressable, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Circle } from 'react-native-svg';
import { Button } from '@/components/ui';
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
 * The daily goal ring and today's plan: review what's due, learn the next
 * station, then explain the weakest concept. One button runs the next step.
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
      <View style={styles.goal} accessible accessibilityLabel={t('plan.goalA11y', { minutes: activity.minutes, goal })}>
        <GoalRing pct={pct} label={`${activity.minutes}/${goal}`} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={typography.subheading}>{t('plan.goalTitle', { goal })}</Text>
          <Text style={typography.caption}>
            {pct >= 1 ? t('plan.goalDone') : t('plan.goalLeft', { minutes: Math.max(0, goal - activity.minutes) })}
          </Text>
        </View>
      </View>

      <Text style={[typography.label, { marginTop: spacing.xs }]}>{t('plan.title').toLocaleUpperCase()}</Text>
      {steps.map((step, i) => (
        <Pressable
          key={step.key}
          accessibilityRole="button"
          accessibilityLabel={`${step.title}. ${step.detail}`}
          accessibilityState={{ checked: step.done }}
          onPress={() => router.push(step.href)}
          style={({ pressed }) => [styles.step, step === firstOpen && { borderColor: colors.primary, borderWidth: 2 }, pressed && { opacity: 0.85 }]}
        >
          <View style={[styles.num, step.done && { backgroundColor: colors.success }]}>
            {step.done ? <Ionicons name="checkmark" size={16} color={colors.onPrimary} /> : <Text style={styles.numText}>{i + 1}</Text>}
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[typography.subheading, step.done && { color: colors.textMuted, textDecorationLine: 'line-through' }]} numberOfLines={2}>
              {step.title}
            </Text>
            <Text style={typography.caption}>{step.detail}</Text>
          </View>
          {!step.done ? <Ionicons name={t.isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.primary} /> : null}
        </Pressable>
      ))}

      {firstOpen ? (
        <Button label={t('plan.continue')} icon="play" onPress={() => router.push(firstOpen.href)} />
      ) : (
        <View style={styles.allDone}>
          <Ionicons name="trophy" size={22} color={colors.success} />
          <Text style={[typography.subheading, { color: colors.success, flex: 1 }]}>{t('plan.allDone')}</Text>
        </View>
      )}
    </View>
  );
}

/** Goal progress ring (green, fills clockwise). */
function GoalRing({ pct, label }: { pct: number; label: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const r = (RING - STROKE) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={styles.ring}>
      <Svg width={RING} height={RING} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={RING / 2} cy={RING / 2} r={r} stroke={colors.surfaceMuted} strokeWidth={STROKE} fill="none" />
        <Circle
          cx={RING / 2}
          cy={RING / 2}
          r={r}
          stroke={colors.success}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - pct)}
        />
      </Svg>
      <Text style={styles.ringLabel}>{label}</Text>
    </View>
  );
}

const RING = 76;
const STROKE = 8;

const useStyles = makeStyles(({ colors, textScale }) => ({
  goal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  ring: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  ringLabel: { color: colors.text, fontWeight: '800', fontSize: Math.round(14 * textScale) },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    minHeight: 64,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  num: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  numText: { color: colors.primary, fontWeight: '800' },
  allDone: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.successSoft, borderRadius: radius.md, padding: spacing.md },
}));
