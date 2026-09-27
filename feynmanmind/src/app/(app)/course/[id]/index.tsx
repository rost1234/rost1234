import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Card, ErrorState, IconButton, LoadingState, ProgressBar, Screen, type IconName } from '@/components/ui';
import { unitsOf, type CourseConcept } from '@/content/types';
import { useCourse, useDeleteCourse } from '@/data/courses';
import { useT } from '@/i18n';
import { confirmAsync } from '@/lib/dialogs';
import { errorMessage } from '@/lib/errors';
import type { StationProgress } from '@/local/logic';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

/** One color per level (foundations → master), with a darker "lip" for the raised-button look. */
const LEVEL_COLORS = [
  { main: '#2FA84F', lip: '#23843C' },
  { main: '#1A8FE3', lip: '#146FB3' },
  { main: '#9B59E0', lip: '#7A41B8' },
  { main: '#F07B12', lip: '#C0600A' },
] as const;
const GOLD = { main: '#FFC800', lip: '#E0A800', ink: '#6B4A00' };
/** Horizontal offsets, applied station after station, that make the map wind like a path. */
const WIND = [0, 48, 72, 48, 0, -48, -72, -48];
const NODE = 72;

const isDone = (p: StationProgress) => p.status === 'mastered' || p.status === 'known';

/** The learning map: a winding path of stations, grouped into units, across four levels. */
export default function CourseMapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const query = useCourse(id);
  const remove = useDeleteCourse();
  const scrollRef = useRef<ScrollView>(null);
  const scrolled = useRef(false);

  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState message={errorMessage(query.error, t)} onRetry={() => void query.refetch()} />;
  const { course, progress } = query.data;
  const byKey = new Map(progress.stations.map((p, i) => [p.key, { p, n: i + 1 }]));

  const confirmDelete = async () => {
    const ok = await confirmAsync({
      title: t('course.deleteTitle', { title: course.title }),
      message: t('course.deleteBody'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (ok) remove.mutate(course.id, { onSuccess: () => router.back() });
  };

  // Bring the current station into view once, when the map first lays out.
  const onCurrentLayout = (y: number) => {
    if (scrolled.current) return;
    scrolled.current = true;
    if (y > 400) scrollRef.current?.scrollTo({ y: y - 260, animated: true });
  };

  const hasQuiz = course.levels.some((l) => l.quiz.length > 0);
  const open = (key: string) => router.push(`/course/${course.id}/${key}`);
  let unitNumber = 0;
  let pathStep = 0;

  // The path is a flat list of rows (banners, unit headers, stations, trophies) so each row's
  // layout y is relative to the scroll content, which is what auto-scrolling needs.
  const rows: ReactNode[] = [];
  course.levels.forEach((level, levelIndex) => {
    const palette = LEVEL_COLORS[levelIndex % LEVEL_COLORS.length]!;
    const lp = progress.levels[levelIndex]!;
    rows.push(
      <View key={`level-${level.key}`} style={[styles.levelBanner, { backgroundColor: palette.main, borderBottomColor: palette.lip }]}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.levelKicker}>{t('course.levelN', { n: levelIndex + 1 })}</Text>
          <Text style={styles.levelTitle} accessibilityRole="header">
            {t(`level.${level.key}`)}
          </Text>
          <Text style={styles.levelHint}>{t(`level.${level.key}.hint`)}</Text>
        </View>
        {lp.known ? (
          <View style={styles.levelPill}>
            <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
            <Text style={styles.levelPillText}>{t('placement.known')}</Text>
          </View>
        ) : (
          <View style={styles.levelPill}>
            <Text style={styles.levelPillText}>{`${lp.done}/${lp.total}`}</Text>
          </View>
        )}
      </View>,
    );

    for (const unit of unitsOf(level.stations)) {
      unitNumber++;
      const unitProgress = unit.stations.map((s) => byKey.get(s.key)!.p);
      const unitDone = unitProgress.filter(isDone).length;
      const complete = unitDone === unit.stations.length;
      rows.push(
        <View key={`unit-${unitNumber}`} style={[styles.unitHeader, { borderColor: palette.main }]}>
          <View style={[styles.unitBadge, { backgroundColor: palette.main }]}>
            <Text style={styles.unitBadgeText}>{unitNumber}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.caption, { color: palette.main, fontWeight: '800' }]}>{t('course.unit', { n: unitNumber })}</Text>
            <Text style={typography.subheading}>{unit.title ?? t(`level.${level.key}`)}</Text>
          </View>
          <Text style={typography.caption}>{t('course.unitProgress', { done: unitDone, total: unit.stations.length })}</Text>
        </View>,
      );
      unit.stations.forEach((station) => {
        const { p, n } = byKey.get(station.key)!;
        const offset = WIND[pathStep++ % WIND.length]!;
        const current = p.key === progress.nextKey;
        rows.push(
          <View
            key={station.key}
            style={[styles.nodeRow, { transform: [{ translateX: offset }] }]}
            onLayout={current ? (e) => onCurrentLayout(e.nativeEvent.layout.y) : undefined}
          >
            <PathNode
              station={station}
              progress={p}
              number={n}
              current={current}
              palette={palette}
              resume={p.status === 'started' || progress.started > 0}
              onPress={() => open(station.key)}
            />
          </View>,
        );
      });
      rows.push(
        <View key={`trophy-${unitNumber}`} style={styles.trophyRow} accessibilityLabel={t('course.unitTrophy')}>
          <View style={[styles.trophy, complete ? { backgroundColor: GOLD.main, borderBottomColor: GOLD.lip } : { backgroundColor: colors.surfaceMuted, borderBottomColor: colors.border }]}>
            <Ionicons name="trophy" size={30} color={complete ? GOLD.ink : colors.textMuted} />
          </View>
        </View>,
      );
    }
  });

  return (
    <>
      <Stack.Screen
        options={{
          title: course.title,
          headerRight: course.builtIn
            ? undefined
            : () => <IconButton icon="trash-outline" label={t('common.delete')} color={colors.danger} onPress={() => void confirmDelete()} />,
        }}
      />
      <Screen scrollRef={scrollRef}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name={course.icon as IconName} size={30} color={colors.primary} />
          </View>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text style={typography.heading}>{course.title}</Text>
            <Text style={typography.caption}>{course.description}</Text>
          </View>
        </View>
        <View style={styles.progressRow}>
          <ProgressBar value={progress.total ? progress.done / progress.total : 0} />
          <Text style={typography.caption}>{t('courses.progress', { done: progress.done, total: progress.total })}</Text>
        </View>

        {hasQuiz ? (
          progress.placement ? (
            <View style={styles.placed}>
              <Ionicons name="locate-outline" size={18} color={colors.primary} />
              <Text style={[typography.caption, { flex: 1 }]}>
                {t('placement.placedAt', { level: t(`level.${course.levels[progress.placement.levelIndex]!.key}`) })}
              </Text>
              <Button label={t('placement.retake')} variant="ghost" onPress={() => router.push(`/course/${course.id}/placement`)} />
            </View>
          ) : (
            <Card style={styles.placementCard}>
              <View style={styles.row}>
                <Ionicons name="school-outline" size={22} color={colors.primary} />
                <Text style={[typography.subheading, { flex: 1 }]}>{t('placement.inviteTitle')}</Text>
              </View>
              <Text style={typography.caption}>{t('placement.inviteBody')}</Text>
              <Button label={t('placement.take')} icon="help-circle-outline" onPress={() => router.push(`/course/${course.id}/placement`)} />
            </Card>
          )
        ) : null}

        {progress.nextKey ? (
          <Button
            label={progress.started === 0 && !progress.placement ? t('course.start') : t('course.continue')}
            icon="play"
            variant={progress.placement || progress.started ? 'primary' : 'secondary'}
            onPress={() => open(progress.nextKey!)}
          />
        ) : (
          <View style={styles.done}>
            <Ionicons name="trophy" size={22} color={colors.success} />
            <Text style={[typography.subheading, { color: colors.success, flex: 1 }]}>{t('course.completed')}</Text>
          </View>
        )}

        {rows}

        {course.sources?.length ? (
          <View style={styles.sources}>
            <View style={styles.row}>
              <Ionicons name="library-outline" size={18} color={colors.textMuted} />
              <Text style={[typography.subheading, { flex: 1 }]}>{t('course.sourcesTitle')}</Text>
            </View>
            <Text style={typography.caption}>{t('course.sourcesBody')}</Text>
            {course.sources.map((source) => (
              <Pressable
                key={source.url}
                accessibilityRole="link"
                onPress={() => void Linking.openURL(source.url)}
                style={({ pressed }) => [styles.sourceRow, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="open-outline" size={16} color={colors.primary} />
                <Text style={[typography.body, { color: colors.primary, flex: 1 }]}>{source.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </Screen>
    </>
  );
}

function PathNode({
  station,
  progress,
  number,
  current,
  palette,
  resume,
  onPress,
}: {
  station: CourseConcept;
  progress: StationProgress;
  number: number;
  current: boolean;
  palette: { main: string; lip: string };
  resume: boolean;
  onPress: () => void;
}) {
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!current) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [current, pulse]);

  const mastered = progress.status === 'mastered';
  const active = current || progress.status !== 'new';
  const fill = mastered ? GOLD : active ? palette : { main: colors.surfaceMuted, lip: colors.border };
  const icon: IconName = mastered ? 'star' : progress.status === 'known' ? 'checkmark' : progress.status === 'started' && !current ? 'book' : 'star';
  const iconColor = mastered ? GOLD.ink : active ? '#FFFFFF' : colors.textMuted;

  return (
    <View style={styles.nodeWrap}>
      {current ? (
        <View style={[styles.bubble, { borderColor: palette.main }]}>
          <Text style={[styles.bubbleText, { color: palette.main }]}>{resume ? t('course.resume') : t('course.go')}</Text>
          <View style={[styles.bubbleArrow, { borderTopColor: palette.main }]} />
        </View>
      ) : null}
      <View style={styles.nodeHolder}>
        {current ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ring,
              { borderColor: palette.main, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0.15] }) },
              { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }] },
            ]}
          />
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('course.station', { n: number })}: ${station.title}`}
          onPress={onPress}
          style={({ pressed }) => [
            styles.node,
            { backgroundColor: fill.main, borderBottomColor: fill.lip },
            pressed && { borderBottomWidth: 2, transform: [{ translateY: 4 }] },
          ]}
        >
          <Ionicons name={icon} size={32} color={iconColor} />
        </Pressable>
        {!progress.hasLesson && progress.status !== 'known' ? (
          <View style={styles.aiBadge}>
            <Ionicons name="sparkles" size={12} color="#FFFFFF" />
          </View>
        ) : null}
      </View>
      <Text style={[typography.caption, styles.nodeTitle, current && { color: colors.text, fontWeight: '700' }]} numberOfLines={2}>
        {station.title}
      </Text>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  placementCard: { borderColor: colors.primary, borderWidth: 2 },
  placed: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  done: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  levelBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    borderBottomWidth: 5,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  levelKicker: { color: '#FFFFFF', opacity: 0.85, fontWeight: '800', fontSize: 12 },
  levelTitle: { color: '#FFFFFF', fontWeight: '800', fontSize: 22 },
  levelHint: { color: '#FFFFFF', opacity: 0.9, fontSize: 13 },
  levelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  levelPillText: { color: '#FFFFFF', fontWeight: '800' },
  unitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 2,
    borderRadius: radius.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    marginTop: spacing.md,
  },
  unitBadge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  unitBadgeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  nodeRow: { alignItems: 'center', marginTop: spacing.sm },
  nodeWrap: { alignItems: 'center', width: 170 },
  nodeHolder: { width: NODE + 20, height: NODE + 20, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: NODE + 20, height: NODE + 20, borderRadius: (NODE + 20) / 2, borderWidth: 4 },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    borderBottomWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeTitle: { textAlign: 'center', marginTop: 2 },
  bubble: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginBottom: 6,
  },
  bubbleText: { fontWeight: '800', fontSize: 15, textAlign: 'center' },
  bubbleArrow: {
    position: 'absolute',
    bottom: -9,
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  sources: {
    gap: spacing.sm,
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  trophyRow: { alignItems: 'center', marginTop: spacing.md },
  trophy: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderBottomWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
