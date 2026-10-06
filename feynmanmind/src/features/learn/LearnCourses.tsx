import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ChoiceChips } from '@/components/ChoiceChips';
import { ScoreRing } from '@/components/ScoreRing';
import { Card, Chevron, LoadingState, SectionHeader, type IconName } from '@/components/ui';
import type { Course } from '@/content/types';
import { useCourses } from '@/data/courses';
import { useT, type TranslationKey } from '@/i18n';
import type { CourseProgress } from '@/local/logic';
import { makeStyles, radius, spacing, useTheme } from '@/theme';
import { NewCourseCard } from './NewCourseCard';

type Category = 'all' | 'science' | 'math' | 'society' | 'mine';

/** Which shelf each built-in course sits on; AI courses go under "mine". */
const CATEGORY: Record<string, Exclude<Category, 'all' | 'mine'>> = {
  physics: 'science',
  biology: 'science',
  math: 'math',
  computing: 'math',
  psychology: 'society',
  economics: 'society',
};
const categoryOf = (course: Course): Exclude<Category, 'all'> => (course.builtIn ? (CATEGORY[course.id] ?? 'science') : 'mine');
const CATEGORY_LABEL: Record<Exclude<Category, 'all'>, TranslationKey> = {
  science: 'learn.cat.science',
  math: 'learn.cat.math',
  society: 'learn.cat.society',
  mine: 'learn.cat.mine',
};

const isStarted = (p: CourseProgress) => p.started > 0 || p.placement !== null;

/** "My courses" (started, side-scrolling with progress rings), then the catalog by field, then "build your own". */
export function LearnCourses() {
  const t = useT();
  const styles = useStyles();
  const { typography } = useTheme();
  const courses = useCourses();
  const [category, setCategory] = useState<Category>('all');

  if (courses.isPending) return <LoadingState />;
  const all = courses.data ?? [];
  const mine = all.filter((c) => isStarted(c.progress));
  const rest = all.filter((c) => !isStarted(c.progress));
  const present = (Object.keys(CATEGORY_LABEL) as Exclude<Category, 'all'>[]).filter((k) => rest.some((c) => categoryOf(c.course) === k));
  const shown = rest.filter((c) => category === 'all' || categoryOf(c.course) === category);
  const groups = present.filter((k) => category === 'all' || k === category);

  return (
    <>
      {mine.length ? (
        <>
          <SectionHeader title={t('learn.mine')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelf} style={styles.shelfOuter}>
            {mine.map(({ course, progress }) => (
              <MiniCourse key={course.id} course={course} progress={progress} />
            ))}
          </ScrollView>
        </>
      ) : null}

      <SectionHeader title={mine.length ? t('learn.discover') : t('courses.title')} />
      {!mine.length ? <Text style={typography.caption}>{t('courses.intro')}</Text> : null}
      {present.length > 1 ? (
        <ChoiceChips<Category>
          label={t('learn.discover')}
          value={category}
          onChange={setCategory}
          options={[{ value: 'all', label: t('learn.cat.all') }, ...present.map((k) => ({ value: k, label: t(CATEGORY_LABEL[k]) }))]}
        />
      ) : null}
      {groups.map((k) => (
        <View key={k} style={{ gap: spacing.sm }}>
          {present.length > 1 ? <Text style={[typography.caption, { fontWeight: '800' }]}>{t(CATEGORY_LABEL[k])}</Text> : null}
          {shown
            .filter((c) => categoryOf(c.course) === k)
            .map(({ course, progress }) => (
              <CourseRow key={course.id} course={course} stations={progress.total} />
            ))}
        </View>
      ))}
      <NewCourseCard />
    </>
  );
}

function MiniCourse({ course, progress }: { course: Course; progress: CourseProgress }) {
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const level = progress.stations.find((s) => s.key === progress.nextKey)?.levelIndex;
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  return (
    <Card style={styles.mini} onPress={() => router.push(`/course/${course.id}`)} accessibilityLabel={`${course.title}, ${pct}%`}>
      <View style={styles.miniTop}>
        <Ionicons name={course.icon as IconName} size={26} color={colors.primary} />
        <ScoreRing score={pct} size={44} stroke={5} color={colors.primary} caption={t('learn.progressA11y', { pct })} />
      </View>
      <Text style={typography.subheading} numberOfLines={1}>
        {course.title}
      </Text>
      <Text style={typography.caption} numberOfLines={1}>
        {level !== undefined ? `${t(`level.${course.levels[level]!.key}`)} · ` : ''}
        {progress.done}/{progress.total}
      </Text>
    </Card>
  );
}

function CourseRow({ course, stations }: { course: Course; stations: number }) {
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  return (
    <Card onPress={() => router.push(`/course/${course.id}`)} accessibilityLabel={course.title}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <Ionicons name={course.icon as IconName} size={24} color={colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={typography.subheading} numberOfLines={1}>
            {course.title}
          </Text>
          <Text style={typography.caption} numberOfLines={2}>
            {course.description}
          </Text>
          <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>
            {t('learn.courseMeta', { levels: course.levels.length, stations })}
          </Text>
        </View>
        <Chevron />
      </View>
    </Card>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  shelfOuter: { marginHorizontal: -spacing.lg, flexGrow: 0 },
  shelf: { gap: spacing.md, paddingHorizontal: spacing.lg },
  mini: { width: 160, gap: spacing.xs },
  miniTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
}));
