import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, Pressable, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text } from '@/components/AppText';
import { ProgressRing } from '@/components/ProgressRing';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { formatFriendlyDate, type LocalDateString } from '@/core/localDate';
import { haptics } from '@/core/haptics';
import { isNight, sproutMood } from '@/domain/garden';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useT, type TranslationKey } from '@/i18n';
import { useHabitStore } from '@/state/habitStore';
import type { Insight } from '@/content/insightSchema';
import { useSproutTipStore } from '@/state/sproutTipStore';
import { LiveSprout } from './LiveSprout';
import { SproutTip } from './SproutTip';
import { ambientLine, doneLine, tapLine, type TalkContext, type TalkLine } from './sproutTalk';
import { stageKey, useGardenGrowth } from './useGarden';

interface GardenHeaderProps {
  today: LocalDateString;
  hour: number;
  percent: number;
  doneCount: number;
  totalCount: number;
  freezes: number;
  dayOffLabel: string | null;
  dayOffName: string | null;
  /** Back after a break: the sprout says it missed you. */
  comeback?: boolean;
  /** Habits due today that weren't skipped (what "all done" means). */
  countedCount?: number;
  /** Today's research insight, told by the sprout (null when there's none). */
  tip?: Insight | null;
}

function greetingKey(hour: number): TranslationKey {
  if (hour < 5) return 'today.greeting.night';
  if (hour < 12) return 'today.greeting.morning';
  if (hour < 18) return 'today.greeting.afternoon';
  return 'today.greeting.evening';
}

/** The sun by day, a moon and a few stars at night. Purely decorative. */
function Sky({ night }: { night: boolean }) {
  const { scenery } = useTheme();
  const styles = useStyles();
  if (!night) {
    return (
      <View pointerEvents="none" style={styles.sky}>
        <View style={[styles.sun, { backgroundColor: scenery.sun }]} />
        <View style={[styles.cloud, { backgroundColor: scenery.cloud }]} />
      </View>
    );
  }
  return (
    <View pointerEvents="none" style={styles.sky}>
      <View style={[styles.sun, { backgroundColor: scenery.sun }]}>
        <View style={[styles.moonBite, { backgroundColor: scenery.hill }]} />
      </View>
      <View style={[styles.star, { backgroundColor: scenery.sun, top: 46, end: 10 }]} />
      <View style={[styles.star, { backgroundColor: scenery.sun, top: 8, end: 120 }]} />
      <View style={[styles.star, { backgroundColor: scenery.sun, top: 30, end: 170, width: 3, height: 3 }]} />
    </View>
  );
}

/** The sprout's speech bubble; a new line pops in gently. Screen readers hear each new line. */
function Bubble({ text, id, stacked, live }: { text: string; id: number | string; stacked: boolean; live: boolean }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const reduce = useReduceMotion();
  const [pop] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (reduce) return;
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, friction: 6, tension: 140, useNativeDriver: true }).start();
  }, [id, pop, reduce]);
  const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });
  return (
    <Animated.View
      style={[styles.bubble, stacked && styles.bubbleStacked, { backgroundColor: colors.surface, opacity: pop, transform: [{ scale }] }]}
      // Only reactions are read out; the everyday line coming back isn't repeated.
      accessibilityLiveRegion={live ? 'polite' : 'none'}
    >
      <View style={[styles.tail, stacked ? styles.tailUp : styles.tailSide, { backgroundColor: colors.surface }]} />
      <Text style={styles.bubbleText}>{text}</Text>
    </Animated.View>
  );
}

/** The day of the year-ish number that varies the sprout's lines from day to day. */
const daySeed = (today: LocalDateString) => Number(today.replace(/-/g, '')) || 0;

/** Seconds a reaction stays before the sprout goes back to its everyday line. */
const EVENT_MS = 9000;

/**
 * Today in the Garden look, built around the sprout: it sits in the day's ring, talks in a bubble
 * (greets, thanks you for each habit, cheers a full day, is glad when you're back), hops when a
 * habit is done and reacts when tapped. Long-press (or "Your sprout") opens every stage.
 */
export function GardenHeader({
  today,
  hour,
  percent,
  doneCount,
  totalCount,
  freezes,
  dayOffLabel,
  dayOffName,
  comeback = false,
  countedCount = totalCount,
  tip = null,
}: GardenHeaderProps) {
  const t = useT();
  const { colors, scenery } = useTheme();
  const styles = useStyles();
  const growth = useGardenGrowth();
  const noHabits = useHabitStore((s) => s.habits.length === 0);
  const bestStreak = useHabitStore((s) => Math.max(0, ...Object.values(s.streaks)));
  // With very large text, the sprout goes above the bubble instead of squeezing it.
  const stacked = useWindowDimensions().fontScale > 1.3;
  const mood = sproutMood(percent, hour, totalCount);
  const stageName = t(stageKey(growth.stage));
  const seed = daySeed(today);
  const tipDismissedOn = useSproutTipStore((s) => s.dismissedOn);
  const showTip = tip !== null && tipDismissedOn !== today;
  const ctx: TalkContext = {
    hour,
    dueCount: countedCount,
    doneCount,
    noHabits,
    comeback,
    dayOff: dayOffLabel !== null,
    bestStreak,
    stage: growth.stage,
    stageName,
    nextName: growth.next === null ? null : t(stageKey(growth.next)),
    toNext: growth.toNext,
    days: growth.days,
    hasTip: showTip,
  };

  // A reaction (a habit done, a tap) shows for a while, then the everyday line comes back.
  const [event, setEvent] = useState<{ kind: 'done' | 'tap'; n: number; id: number } | null>(null);
  const [cheerKey, setCheerKey] = useState(0);
  const [pokeKey, setPokeKey] = useState(0);
  const seq = useRef(0);
  const lastDone = useRef(doneCount);
  useEffect(() => {
    if (doneCount > lastDone.current) {
      seq.current += 1;
      setCheerKey((k) => k + 1);
      setEvent({ kind: 'done', n: doneCount, id: seq.current });
    } else if (doneCount < lastDone.current) {
      setEvent(null);
    }
    lastDone.current = doneCount;
  }, [doneCount]);
  useEffect(() => {
    if (!event) return;
    const timer = setTimeout(() => setEvent(null), EVENT_MS);
    return () => clearTimeout(timer);
  }, [event]);

  const poke = () => {
    haptics.tap();
    seq.current += 1;
    setPokeKey((k) => k + 1);
    setEvent({ kind: 'tap', n: pokeKey + 1, id: seq.current });
  };

  const line: TalkLine = !event ? ambientLine(ctx, seed) : event.kind === 'done' ? doneLine(ctx, seed + event.n) : tapLine(ctx, event.n);
  const lineId = event ? event.id : line.key;
  const said = line.plural !== undefined ? t.plural(line.key, line.plural, line.params) : t(line.key as TranslationKey, line.params);
  // Android reads the bubble's live region; iOS needs the new line announced.
  useEffect(() => {
    if (event && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(said);
    // Only when a new reaction appears, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id]);
  const message =
    totalCount === 0
      ? t('today.quietDay')
      : percent >= 100
        ? t('today.allDone')
        : t('today.doneOf', { done: doneCount, total: totalCount });

  return (
    <View style={[styles.hill, { backgroundColor: scenery.hill }]}>
      <Sky night={isNight(hour)} />
      <View style={styles.top}>
        {dayOffLabel ? (
          <View style={[styles.pill, { backgroundColor: colors.surface }]} accessible accessibilityLabel={dayOffName ?? dayOffLabel}>
            <Text style={[styles.pillText, { color: colors.text }]}>{dayOffLabel}</Text>
          </View>
        ) : null}
        <Text style={styles.date} accessibilityRole="header">
          {formatFriendlyDate(today, t.locale)}
        </Text>
        <Text style={styles.greeting} maxFontSizeMultiplier={1.5}>
          {t(greetingKey(hour))}
        </Text>
      </View>

      <View style={[styles.stageRow, stacked && styles.stacked]}>
        <Bubble text={said} id={lineId} stacked={stacked} live={event !== null} />
        {/* The sprout grows with every day a habit is done; the ring around it is today. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            totalCount === 0 ? t('garden.headerA11yQuiet', { stage: stageName, quiet: t('today.quietDay') }) : t('garden.headerA11y', { stage: stageName, percent })
          }
          accessibilityHint={t('garden.sproutHint')}
          onPress={poke}
          onLongPress={() => {
            haptics.select();
            router.push('/garden');
          }}
          delayLongPress={400}
          hitSlop={6}
          style={[styles.ringWrap, stacked && { alignSelf: 'center' }]}
        >
          <ProgressRing value={percent / 100} size={148} stroke={10} track={colors.border} from={colors.primary} to={colors.primary}>
            <View style={[styles.ringInner, { backgroundColor: colors.surface }]}>
              <LiveSprout stage={growth.stage} mood={mood} size={104} cheerKey={cheerKey} talkKey={lineId} pokeKey={pokeKey} />
            </View>
          </ProgressRing>
          <Text style={styles.stage} numberOfLines={1}>
            {stageName}
          </Text>
        </Pressable>
      </View>

      {showTip && tip ? <SproutTip insight={tip} today={today} stage={growth.stage} /> : null}

      <Text style={styles.message}>{message}</Text>
      <View style={styles.pills}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('today.freezesA11y', { count: freezes })}
          accessibilityHint={t('protect.title')}
          onPress={() => router.push('/streaks')}
          hitSlop={6}
          style={({ pressed }) => [styles.pill, { backgroundColor: scenery.sky }, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="snow" size={14} color={scenery.skyText} />
          <Text style={[styles.pillText, { color: scenery.skyText }]}>{t.plural('today.freezes', freezes)}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('garden.insights')}
          accessibilityHint={t('home.openInsights')}
          onPress={() => router.push('/analytics')}
          hitSlop={6}
          style={({ pressed }) => [styles.pill, { backgroundColor: colors.surface }, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="bar-chart-outline" size={14} color={colors.text} />
          <Text style={[styles.pillText, { color: colors.text }]}>{t('garden.insights')}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('garden.yourSprout')}
          accessibilityHint={t('garden.headerHint')}
          onPress={() => router.push('/garden')}
          hitSlop={6}
          style={({ pressed }) => [styles.pill, { backgroundColor: colors.surface }, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="leaf-outline" size={14} color={colors.text} />
          <Text style={[styles.pillText, { color: colors.text }]}>{t('garden.yourSprout')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  hill: {
    marginHorizontal: -spacing.lg,
    marginTop: -spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl + spacing.sm,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: 44,
    borderBottomRightRadius: 44,
    overflow: 'hidden',
  },
  sky: { position: 'absolute', top: 0, start: 0, end: 0, height: 70 },
  sun: { position: 'absolute', top: 12, end: 20, width: 30, height: 30, borderRadius: 15, overflow: 'hidden' },
  moonBite: { position: 'absolute', top: -6, end: -8, width: 28, height: 28, borderRadius: 14 },
  cloud: { position: 'absolute', top: 20, end: 130, width: 64, height: 20, borderRadius: 10 },
  star: { position: 'absolute', width: 4, height: 4, borderRadius: 2 },
  top: { gap: 2, marginTop: spacing.sm },
  stageRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  stacked: { flexDirection: 'column-reverse', alignItems: 'stretch' },
  date: { fontSize: 15, color: colors.textMuted },
  greeting: { fontSize: 30, lineHeight: 38, fontWeight: '800', color: colors.text },
  bubble: {
    flex: 1,
    minHeight: 64,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: 20,
  },
  bubbleStacked: { flex: 0 },
  bubbleText: { fontSize: 16, lineHeight: 23, color: colors.text },
  tail: { position: 'absolute', width: 16, height: 16, transform: [{ rotate: '45deg' }] },
  tailSide: { end: -6, top: '50%', marginTop: -8 },
  tailUp: { top: -6, alignSelf: 'center' },
  message: { fontSize: 16, color: colors.text, marginTop: spacing.md },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    minHeight: 34,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  pillText: { fontSize: 14 },
  ringWrap: { alignItems: 'center', gap: 4 },
  ringInner: { width: 126, height: 126, borderRadius: 63, alignItems: 'center', justifyContent: 'center' },
  stage: { fontSize: 13, color: colors.text, maxWidth: 148, textAlign: 'center' },
}));
