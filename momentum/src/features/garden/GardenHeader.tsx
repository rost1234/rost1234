import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Platform, Pressable, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text } from '@/components/AppText';
import { ProgressRing } from '@/components/ProgressRing';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { formatFriendlyDate, type LocalDateString } from '@/core/localDate';
import { haptics } from '@/core/haptics';
import { accessoryFor, hillFlowers, isNight, isRainyDay, sproutMood, visitorEmoji, visitorsEarned, yearsSince, type VisitorId } from '@/domain/garden';
import { holidayOn } from '@/domain/holidays';
import { useGardenStore } from '@/state/gardenStore';
import { usePrefsStore } from '@/state/prefsStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useT, type TranslationKey } from '@/i18n';
import { useHabitStore } from '@/state/habitStore';
import { insightById, insightLines } from '@/content/insights';
import type { Insight } from '@/content/insightSchema';
import { useNotebookStore, type MomentReason } from '@/state/notebookStore';
import { useSproutTipStore } from '@/state/sproutTipStore';
import { LiveSprout } from './LiveSprout';
import { ArtShapes } from './Sprout';
import { hillFlowerShapes } from './sproutArt';
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
function Sky({ night, rain = false }: { night: boolean; rain?: boolean }) {
  const { scenery } = useTheme();
  const styles = useStyles();
  // A winter day: a cloud with a few drops instead of the sun.
  if (rain) {
    return (
      <View pointerEvents="none" style={styles.sky}>
        <View style={[styles.cloud, styles.rainCloud, { backgroundColor: scenery.cloud }]} />
        {RAIN_DROPS.map((d, i) => (
          <View key={i} style={[styles.drop, { backgroundColor: scenery.skyText, top: d.top, end: d.end }]} />
        ))}
      </View>
    );
  }
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

const RAIN_DROPS = [
  { top: 40, end: 34 },
  { top: 50, end: 50 },
  { top: 44, end: 66 },
  { top: 54, end: 82 },
];

/** One small flower on the hill for each habit done today; a full day fills the hill. Decorative. */
function HillFlowers({ count }: { count: number }) {
  const styles = useStyles();
  if (count === 0) return null;
  return (
    <View pointerEvents="none" style={styles.flowers} accessible={false} importantForAccessibility="no-hide-descendants">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.flower, { marginTop: (i % 3) * 4 }]}>
          <ArtShapes shapes={hillFlowerShapes(i)} size={22} />
        </View>
      ))}
    </View>
  );
}

/** The sprout's speech bubble; a new line pops in gently. Screen readers hear each new line. */
function Bubble({
  text,
  id,
  stacked,
  live,
  long = false,
  children,
}: {
  text: string;
  id: number | string;
  stacked: boolean;
  live: boolean;
  /** A research card: a little smaller, it's a longer line. */
  long?: boolean;
  /** Small buttons under the line. */
  children?: ReactNode;
}) {
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
      <Text style={[styles.bubbleText, long && styles.bubbleTextLong]}>{text}</Text>
      {children}
    </Animated.View>
  );
}

/** The day of the year-ish number that varies the sprout's lines from day to day. */
const daySeed = (today: LocalDateString) => Number(today.replace(/-/g, '')) || 0;

/** Seconds a reaction stays before the sprout goes back to its everyday line. */
const EVENT_MS = 9000;

/** The bubble's small buttons take touches a little around them (the row leaves room for it). */
const TELL_SLOP = { top: 5, bottom: 5, left: 4, right: 4 };

/** How the sprout opens a moment's card ("Not today? That's fine."). */
const MOMENT_INTRO: Record<MomentReason, TranslationKey> = {
  notToday: 'moment.notToday',
  lowMood: 'moment.lowMood',
  focusStopped: 'moment.focusStopped',
  newHabit: 'moment.newHabit',
};

/**
 * Today in the Garden look, built around the sprout: it sits in the day's ring, talks in a bubble
 * (greets, thanks you for each habit, cheers a full day, is glad when you're back), hops when a
 * habit is done and reacts when tapped. Long-press (or "Your sprout") opens every stage.
 * It also tells research in its own words: the morning's card, and at most one more when something
 * happens that a study speaks to. "What do we do?" swaps in its suggestion, "Thanks" puts the card
 * away, the star keeps it in the notebook (where the sources are).
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
  const moment = useNotebookStore((s) => s.moment);
  const saved = useNotebookStore((s) => s.saved);
  // The card it's telling now: a moment's card first, then the morning's (until "Thanks").
  const momentCard = moment && moment.date === today && !moment.dismissed ? (insightById(moment.id) ?? null) : null;
  const told: { insight: Insight; moment: MomentReason | null } | null = momentCard
    ? { insight: momentCard, moment: moment?.reason ?? null }
    : tip !== null && tipDismissedOn !== today
      ? { insight: tip, moment: null }
      : null;
  // Its name, special days and visitors.
  const sproutName = useGardenStore((s) => s.name);
  const plantedOn = useGardenStore((s) => s.plantedOn);
  const visitors = useGardenStore((s) => s.visitors);
  const gardenReady = useGardenStore((s) => s.isHydrated);
  const createdOn = useSettingsStore((s) => s.settings?.createdAt.slice(0, 10) ?? null);
  const perfectWeek = useSettingsStore((s) => s.settings?.lastFreezeAwardDate != null);
  const holidaysOn = usePrefsStore((s) => s.holidays) ?? t.language === 'he';
  const birthday = plantedOn ?? createdOn;
  const special = accessoryFor(today, holidaysOn ? holidayOn(today) : null, birthday);
  const fullDay = countedCount > 0 && doneCount >= countedCount;
  useEffect(() => {
    if (!gardenReady) return;
    useGardenStore.getState().welcome(visitorsEarned({ days: growth.days, fullDay, bestStreak, comeback, perfectWeek }), today);
  }, [gardenReady, growth.days, fullDay, bestStreak, comeback, perfectWeek, today]);
  const visitorToday = (Object.entries(visitors) as [VisitorId, string][]).find(([, date]) => date === today)?.[0] ?? null;
  const [actionFor, setActionFor] = useState<string | null>(null);
  const showingAction = told !== null && actionFor === told.insight.id;
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
    special,
    years: special === 'party' && birthday ? yearsSince(birthday, today) : undefined,
    visitor: visitorToday,
    plantedToday: plantedOn === today,
    name: sproutName,
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
  // A reaction shows for a moment; otherwise the card it's telling, otherwise its everyday line.
  const telling = event === null && told !== null;
  const lines = told ? insightLines(told.insight, t.language === 'he', true) : null;
  const tellText = !told || !lines ? '' : showingAction ? lines.action : told.moment ? `${t(MOMENT_INTRO[told.moment])} ${lines.finding}` : lines.finding;
  const lineId = event ? event.id : telling && told ? `tip:${told.insight.id}:${showingAction ? 'action' : 'finding'}` : line.key;
  const said = telling
    ? tellText
    : line.plural !== undefined
      ? t.plural(line.key, line.plural, line.params)
      : t(line.key as TranslationKey, line.params);
  const isSaved = told !== null && saved.includes(told.insight.id);
  // Android reads the bubble's live region; iOS needs the new line announced.
  const announceId = event ? `event:${event.id}` : told?.moment ? lineId : null;
  useEffect(() => {
    if (announceId && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(said);
    // Only when a new reaction or moment card appears, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announceId]);

  const thanks = () => {
    if (!told) return;
    haptics.tap();
    setActionFor(null);
    if (told.moment) useNotebookStore.getState().dismissMoment();
    else useSproutTipStore.getState().dismiss(today);
  };
  const message =
    totalCount === 0
      ? t('today.quietDay')
      : percent >= 100
        ? t('today.allDone')
        : t('today.doneOf', { done: doneCount, total: totalCount });

  return (
    <View style={[styles.hill, { backgroundColor: scenery.hill }]}>
      <Sky night={isNight(hour)} rain={!isNight(hour) && isRainyDay(today)} />
      <HillFlowers count={hillFlowers(doneCount)} />
      {/* Settings and Focus (the month and progress are tabs below). */}
      <View style={styles.corner}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('home.settings')}
          onPress={() => router.push('/settings')}
          hitSlop={6}
          style={({ pressed }) => [styles.cornerButton, { backgroundColor: colors.surface }, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="settings-outline" size={20} color={colors.text} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('home.focus')}
          onPress={() => router.push('/focus')}
          hitSlop={6}
          style={({ pressed }) => [styles.cornerButton, { backgroundColor: colors.surface }, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="timer-outline" size={20} color={colors.text} />
        </Pressable>
      </View>
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
              <LiveSprout stage={growth.stage} mood={mood} size={104} cheerKey={cheerKey} talkKey={lineId} pokeKey={pokeKey} accessory={special} />
            </View>
          </ProgressRing>
          {visitorToday ? (
            <Text style={styles.visitor} accessible={false} importantForAccessibility="no">
              {visitorEmoji(visitorToday)}
            </Text>
          ) : null}
          <Text style={styles.stage} numberOfLines={1}>
            {sproutName ? `${sproutName} · ${stageName}` : stageName}
          </Text>
        </Pressable>
        <Bubble text={said} id={lineId} stacked={stacked} live={event !== null || (telling && told?.moment != null)} long={telling}>
          {telling && told ? (
            <View style={styles.tellRow}>
              {showingAction ? null : (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    haptics.select();
                    setActionFor(told.insight.id);
                    // The button goes away with the new line: read the suggestion out.
                    if (lines) AccessibilityInfo.announceForAccessibility(lines.action);
                  }}
                  hitSlop={TELL_SLOP}
                  style={({ pressed }) => [styles.tellPill, { backgroundColor: colors.primarySoft }, pressed && { opacity: 0.8 }]}
                >
                  <Text style={[styles.tellPillText, { color: colors.primaryDeep }]}>{t('tip.whatToDo')}</Text>
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityHint={t('tip.thanksHint')}
                onPress={thanks}
                hitSlop={TELL_SLOP}
                style={({ pressed }) => [styles.tellPill, styles.tellPillQuiet, { borderColor: colors.border }, pressed && { opacity: 0.8 }]}
              >
                <Text style={[styles.tellPillText, { color: colors.textMuted }]}>{t('tip.thanks')}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isSaved ? t('tip.savedA11y') : t('tip.save')}
                accessibilityState={{ selected: isSaved }}
                onPress={() => {
                  haptics.select();
                  useNotebookStore.getState().toggleSaved(told.insight.id);
                }}
                hitSlop={TELL_SLOP}
                style={({ pressed }) => [styles.saveStar, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name={isSaved ? 'star' : 'star-outline'} size={18} color={isSaved ? scenery.sun : scenery.coral} />
              </Pressable>
            </View>
          ) : null}
        </Bubble>
      </View>

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
          accessibilityHint={t('notebook.openHint')}
          onPress={() => router.push('/notebook')}
          hitSlop={6}
          style={({ pressed }) => [styles.pill, { backgroundColor: colors.surface }, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="book-outline" size={14} color={colors.text} />
          <Text style={[styles.pillText, { color: colors.text }]}>{t('notebook.pill')}</Text>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl + spacing.sm,
    // Room under the pills for the day's flowers.
    paddingBottom: spacing.xl + spacing.md,
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
  corner: { flexDirection: 'row', gap: spacing.sm, alignSelf: 'flex-start' },
  cornerButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  stageRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  stacked: { flexDirection: 'column', alignItems: 'stretch' },
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
  bubbleTextLong: { fontSize: 15, lineHeight: 22 },
  tail: { position: 'absolute', width: 16, height: 16, transform: [{ rotate: '45deg' }] },
  tailSide: { start: -6, top: '50%', marginTop: -8 },
  tellRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: spacing.xs, paddingVertical: 5 },
  tellPill: { minHeight: 34, paddingHorizontal: 12, borderRadius: radius.pill, justifyContent: 'center' },
  tellPillQuiet: { borderWidth: 1.5 },
  tellPillText: { fontSize: 13, fontWeight: '600' },
  saveStar: { width: 36, height: 34, marginStart: 'auto', alignItems: 'center', justifyContent: 'center' },
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
  visitor: { position: 'absolute', top: -4, end: -2, fontSize: 26 },
  flowers: { position: 'absolute', bottom: 4, start: spacing.xl, end: spacing.xl, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end' },
  flower: { width: 22, height: 22 },
  rainCloud: { top: 18, end: 28, width: 80, height: 24, borderRadius: 12 },
  drop: { position: 'absolute', width: 3, height: 9, borderRadius: 2, opacity: 0.7 },
  ringInner: { width: 126, height: 126, borderRadius: 63, alignItems: 'center', justifyContent: 'center' },
  stage: { fontSize: 13, color: colors.text, maxWidth: 148, textAlign: 'center' },
}));
