import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text } from '@/components/AppText';
import { ProgressRing } from '@/components/ProgressRing';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { formatFriendlyDate, type LocalDateString } from '@/core/localDate';
import { isNight, sproutMood } from '@/domain/garden';
import { useT, type TranslationKey } from '@/i18n';
import { Sprout } from './Sprout';
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
        <View style={styles.cloud} />
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

/** Today in the Garden look: the date and the day's progress, with the sprout inside the day's ring. */
export function GardenHeader({ today, hour, percent, doneCount, totalCount, freezes, dayOffLabel, dayOffName }: GardenHeaderProps) {
  const t = useT();
  const { colors, scenery } = useTheme();
  const styles = useStyles();
  const growth = useGardenGrowth();
  const mood = sproutMood(percent, hour, totalCount);
  const stageName = t(stageKey(growth.stage));
  const message =
    totalCount === 0
      ? t('today.quietDay')
      : percent >= 100
        ? t('today.allDone')
        : t('today.doneOf', { done: doneCount, total: totalCount });

  return (
    <View style={[styles.hill, { backgroundColor: scenery.hill }]}>
      <Sky night={isNight(hour)} />
      <View style={styles.row}>
        <View style={styles.text}>
          {dayOffLabel ? (
            <View style={[styles.pill, { backgroundColor: colors.surface }]} accessible accessibilityLabel={dayOffName ?? dayOffLabel}>
              <Text style={[styles.pillText, { color: colors.text }]}>{dayOffLabel}</Text>
            </View>
          ) : null}
          <Text style={styles.date} accessibilityRole="header">
            {formatFriendlyDate(today, t.locale)}
          </Text>
          <Text style={styles.greeting}>{t(greetingKey(hour))}</Text>
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
              accessibilityLabel={t('home.openInsights')}
              onPress={() => router.push('/analytics')}
              hitSlop={6}
              style={({ pressed }) => [styles.pill, { backgroundColor: colors.surface }, pressed && { opacity: 0.8 }]}
            >
              <Ionicons name="bar-chart-outline" size={14} color={colors.text} />
              <Text style={[styles.pillText, { color: colors.text }]}>{t('garden.insights')}</Text>
            </Pressable>
          </View>
        </View>
        {/* The sprout grows with every habit done; the ring around it is today. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('garden.headerA11y', { stage: stageName, percent })}
          accessibilityHint={t('garden.headerHint')}
          onPress={() => router.push('/garden')}
          hitSlop={6}
          style={({ pressed }) => [styles.ringWrap, pressed && { transform: [{ scale: 0.97 }] }]}
        >
          <ProgressRing value={percent / 100} size={124} stroke={9} track={colors.border} from={colors.primary} to={colors.primary}>
            <View style={[styles.ringInner, { backgroundColor: colors.surface }]}>
              <Sprout stage={growth.stage} mood={mood} size={86} />
            </View>
          </ProgressRing>
          <Text style={styles.stage} numberOfLines={1}>
            {stageName}
          </Text>
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
  cloud: { position: 'absolute', top: 20, end: 130, width: 64, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.7)' },
  star: { position: 'absolute', width: 4, height: 4, borderRadius: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  text: { flex: 1, gap: 2 },
  date: { fontSize: 15, color: colors.textMuted },
  greeting: { fontSize: 30, lineHeight: 38, fontWeight: '800', color: colors.text },
  message: { fontSize: 16, color: colors.text, marginTop: 2 },
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
  ringInner: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center' },
  stage: { fontSize: 13, color: colors.text, maxWidth: 124, textAlign: 'center' },
}));
