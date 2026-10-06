import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ProgressRing } from '@/components/ProgressRing';
import { Banner, Button, Card, Chip } from '@/components/ui';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { useBottomSpace } from '@/components/useBottomSpace';
import { haptics } from '@/core/haptics';
import { runDetached, toErrorMessage } from '@/core/errors';
import { addDays, localDateFromIso } from '@/core/localDate';
import { repositories } from '@/data/repositories';
import type { Habit, UrgeLog, UrgeMode, UrgeOutcome, UrgeTrigger } from '@/domain/models';
import { formatClock } from '@/domain/focusTimer';
import { consistency } from '@/domain/motivation';
import { isPaused } from '@/domain/pauses';
import { passedThisMonth, URGE_MINUTES, URGE_TRIGGERS } from '@/domain/urges';
import { useLocalDate } from '@/hooks/useLocalDate';
import { useNow } from '@/hooks/useNow';
import { useHabitStore } from '@/state/habitStore';
import { usePlanningStore } from '@/state/planningStore';
import { useT, type TranslationKey } from '@/i18n';
import { quitPlanText } from './quitText';
import { useUrgeStore } from './urgeStore';

const TRIGGER_KEYS: Record<UrgeTrigger, TranslationKey> = {
  tired: 'urge.tr.tired',
  stress: 'urge.tr.stress',
  bored: 'urge.tr.bored',
  meal: 'urge.tr.meal',
  people: 'urge.tr.people',
  other: 'urge.tr.other',
};

const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

function CloseButton({ onPress }: { onPress: () => void }) {
  const t = useT();
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t('sheet.close')} onPress={onPress} hitSlop={10} style={styles.close}>
      <Ionicons name="close" size={20} color={colors.text} />
    </Pressable>
  );
}

/** The plan and the reason, shown when the urge comes. */
function PlanCard({ habit }: { habit: Habit }) {
  const t = useT();
  const { typography } = useTheme();
  const styles = useStyles();
  const plan = quitPlanText(habit, t);
  if (!plan && !habit.why) return null;
  return (
    <Card style={styles.plan}>
      {plan ? (
        <>
          <Text style={typography.overline}>{t('urge.yourPlan')}</Text>
          <Text style={styles.planText}>{plan}</Text>
        </>
      ) : null}
      {plan && habit.why ? <View style={styles.divider} /> : null}
      {habit.why ? (
        <>
          <Text style={typography.overline}>{t('urge.why')}</Text>
          <Text style={typography.body}>{habit.why}</Text>
        </>
      ) : null}
    </Card>
  );
}

function ModeButton({ mode, primary, onPress }: { mode: UrgeMode; primary: boolean; onPress: () => void }) {
  const t = useT();
  const { colors } = useTheme();
  const styles = useStyles();
  const fg = primary ? colors.onPrimary : colors.primary;
  const title = mode === 'sit' ? t('urge.sit', { minutes: URGE_MINUTES.sit }) : t('urge.walk', { minutes: URGE_MINUTES.walk });
  const hint = mode === 'sit' ? t('urge.sitHint') : t('urge.walkHint');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${hint}`}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.mode, primary ? styles.modePrimary : styles.modeSecondary, pressed && { opacity: 0.85 }]}
    >
      <Ionicons name={mode === 'sit' ? 'timer-outline' : 'walk-outline'} size={26} color={fg} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.modeTitle, { color: fg }]}>{title}</Text>
        <Text style={[styles.modeHint, { color: primary ? colors.onPrimary : colors.textMuted }]}>{hint}</Text>
      </View>
    </Pressable>
  );
}

interface Result {
  log: UrgeLog;
  passedCount: number;
}

/**
 * "Urge now" for a habit to quit: ride the urge out for a few minutes (the phone
 * can be locked; one notification comes at the end), then one question: did it pass?
 * No medical claims, no counting what was lost.
 */
export function UrgeScreen() {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const bottomSpace = useBottomSpace();
  const today = useLocalDate();
  const params = useLocalSearchParams<{ habitId?: string }>();
  const session = useUrgeStore((s) => s.session);
  const habitId = session?.habitId ?? params.habitId;
  const habit = useHabitStore((s) => s.habits.find((h) => h.id === habitId));
  const [result, setResult] = useState<Result | null>(null);
  const [trigger, setTrigger] = useState<UrgeTrigger | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const now = useNow(!!session && !result);

  useEffect(() => {
    const store = useUrgeStore.getState();
    runDetached(store.hydrate());
    store.setScreenOpen(true);
    return () => useUrgeStore.getState().setScreenOpen(false);
  }, []);

  // The 30-day picture for the "not this time" note, like the habit card's "26/30".
  const pauses = usePlanningStore((s) => s.pauses);
  const picture = useHabitStore((s) => {
    const byDate = habit ? s.logs[habit.id] : undefined;
    if (!habit || !s.today || !byDate) return null;
    const result = consistency(habit, new Map(Object.entries(byDate).map(([d, l]) => [d, l.status])), s.today, (date) => isPaused(pauses, date, habit.id));
    return result.due >= 7 ? `${result.done}/${result.due}` : null;
  });

  const remainingSeconds = session ? Math.max(0, Math.ceil((session.endsAt - now.getTime()) / 1000)) : 0;
  const phase = result ? 'done' : !session ? 'choose' : remainingSeconds > 0 ? 'timer' : 'ask';
  useEffect(() => {
    if (phase === 'ask') {
      haptics.success();
      useUrgeStore.getState().markPrompted();
    }
  }, [phase]);

  const answer = async (outcome: UrgeOutcome) => {
    if (!session || saving) return;
    setSaving(true);
    try {
      const log = await repositories.urges.create({
        habitId: session.habitId,
        startedAt: session.startedAt,
        logDate: localDateFromIso(session.startedAt),
        outcome,
        trigger: null,
        mode: session.mode,
      });
      const month = await repositories.urges.getInRange(addDays(today, -31), today).catch(() => [log]);
      useUrgeStore.getState().clear();
      if (outcome === 'passed') haptics.success();
      setResult({ log, passedCount: Math.max(1, passedThisMonth(month, session.habitId, today)) });
    } catch (e) {
      setError(t('urge.saveError', { error: toErrorMessage(e) }));
    } finally {
      setSaving(false);
    }
  };

  const pickTrigger = (tag: UrgeTrigger) => {
    if (!result) return;
    const next = trigger === tag ? null : tag;
    setTrigger(next);
    runDetached(repositories.urges.setTrigger(result.log.id, next));
  };

  const leave = () => {
    useUrgeStore.getState().clear();
    close();
  };

  if (!habit) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={[styles.content, { flex: 1 }]}>
          <View style={styles.topRow}>
            <CloseButton onPress={leave} />
          </View>
          <Text style={typography.body}>{t('urge.noHabit')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const minutes = session ? URGE_MINUTES[session.mode] : URGE_MINUTES.sit;
  const total = minutes * 60;
  const endTime = session ? new Date(session.endsAt).toLocaleTimeString(t.locale, { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomSpace }]}>
        {error ? <Banner message={error} onDismiss={() => setError(null)} /> : null}

        {phase === 'choose' ? (
          <>
            <View style={styles.topRow}>
              <CloseButton onPress={close} />
            </View>
            <Ionicons name="water-outline" size={36} color={colors.primary} />
            <Text style={typography.title} accessibilityRole="header">
              {t('urge.title')}
            </Text>
            <Text style={typography.body}>{t('urge.lead')}</Text>
            <PlanCard habit={habit} />
            <View style={styles.modes}>
              <ModeButton mode="sit" primary onPress={() => runDetached(useUrgeStore.getState().start(habit.id, 'sit'))} />
              <ModeButton mode="walk" primary={false} onPress={() => runDetached(useUrgeStore.getState().start(habit.id, 'walk'))} />
            </View>
          </>
        ) : null}

        {phase === 'timer' ? (
          <>
            <Text style={[typography.caption, styles.center]}>{t('urge.timerTitle', { title: habit.title })}</Text>
            <View style={styles.timer}>
              <ProgressRing value={1 - remainingSeconds / total} size={240} stroke={12} track={colors.primarySoft} from={colors.primary} to={colors.primary}>
                <Text
                  style={styles.clock}
                  maxFontSizeMultiplier={1.2}
                  accessibilityRole="timer"
                  accessibilityLabel={`${formatClock(remainingSeconds)} ${t('timer.remaining')}`}
                >
                  {formatClock(remainingSeconds)}
                </Text>
                <Text style={typography.caption}>{remainingSeconds < total / 2 ? t('urge.fading') : t('urge.riding')}</Text>
              </ProgressRing>
            </View>
            {quitPlanText(habit, t) ? (
              <Card style={styles.meanwhile}>
                <Text style={[typography.caption, styles.center]}>{t('urge.meanwhile')}</Text>
                <Text style={[styles.planText, styles.center]}>{habit.microStep || quitPlanText(habit, t)}</Text>
              </Card>
            ) : null}
            <Text style={[typography.caption, styles.center]}>{t('urge.lockHint', { time: endTime })}</Text>
            <Button label={t('urge.passedEarly')} onPress={() => void answer('passed')} loading={saving} />
            <Button label={t('urge.leave')} variant="ghost" onPress={leave} />
          </>
        ) : null}

        {phase === 'ask' ? (
          <>
            <View style={styles.topRow}>
              <CloseButton onPress={leave} />
            </View>
            <Text style={typography.title} accessibilityRole="header" accessibilityLiveRegion="polite">
              {t('urge.askTitle', { minutes })}
            </Text>
            <Text style={typography.body}>{t('urge.askLead')}</Text>
            <Button label={t('urge.passed')} onPress={() => void answer('passed')} loading={saving} />
            <Button label={t('urge.notThisTime')} variant="secondary" onPress={() => void answer('slipped')} disabled={saving} />
          </>
        ) : null}

        {phase === 'done' && result ? (
          <>
            <View style={[styles.resultCard, { backgroundColor: result.log.outcome === 'passed' ? colors.successSoft : colors.surfaceMuted }]}>
              <Text style={styles.resultText} accessibilityLiveRegion="polite">
                {result.log.outcome === 'passed'
                  ? t.plural('urge.passedNth', result.passedCount)
                  : picture
                    ? t('urge.slipWithPicture', { done: picture.split('/')[0] ?? '', due: picture.split('/')[1] ?? '' })
                    : t('urge.slip')}
              </Text>
            </View>
            <Card style={styles.triggers}>
              <Text style={typography.label}>
                {t('urge.whatBrought')} <Text style={typography.caption}>{t('urge.optional')}</Text>
              </Text>
              <View style={styles.chips}>
                {URGE_TRIGGERS.map((tag) => (
                  <Chip key={tag} label={t(TRIGGER_KEYS[tag])} selected={trigger === tag} onPress={() => pickTrigger(tag)} />
                ))}
              </View>
              <Text style={typography.caption}>{t('urge.triggerHint')}</Text>
            </Card>
            <Button label={t('urge.finish')} onPress={close} />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  topRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
  plan: { gap: spacing.sm },
  planText: { fontSize: 17, fontWeight: '700', color: colors.text },
  divider: { height: 1, backgroundColor: colors.border },
  modes: { gap: spacing.md, marginTop: spacing.sm },
  mode: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 76, paddingHorizontal: spacing.lg, borderRadius: radius.lg },
  modePrimary: { backgroundColor: colors.primary },
  modeSecondary: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.primary },
  modeTitle: { fontSize: 17, fontWeight: '700' },
  modeHint: { fontSize: 13 },
  timer: { alignItems: 'center', marginVertical: spacing.md },
  clock: { fontSize: 52, fontWeight: '300', color: colors.text, fontVariant: ['tabular-nums'] },
  meanwhile: { gap: spacing.xs },
  resultCard: { borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.xl },
  resultText: { fontSize: 18, fontWeight: '700', color: colors.text, lineHeight: 26 },
  triggers: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
}));
