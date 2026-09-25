import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Card, Chevron, InlineError, LoadingState, ProgressBar, SectionHeader, TextField, type IconName } from '@/components/ui';
import { useCourses, useGenerateCourse } from '@/data/courses';
import { useT } from '@/i18n';
import { useAiConfigured } from '@/lib/env';
import { errorMessage } from '@/lib/errors';
import { haptics } from '@/lib/haptics';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

/** The guided learning paths: built-in courses, the learner's AI courses, and "build a new one". */
export function CoursesSection() {
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const courses = useCourses();

  return (
    <>
      <SectionHeader title={t('courses.title')} />
      <Text style={typography.caption}>{t('courses.intro')}</Text>
      {courses.isPending ? <LoadingState /> : null}
      {courses.data?.map(({ course, progress }) => {
        const total = course.concepts.length;
        const done = progress.mastered;
        return (
          <Card key={course.id} onPress={() => router.push(`/course/${course.id}`)} accessibilityLabel={course.title}>
            <View style={styles.row}>
              <View style={styles.icon}>
                <Ionicons name={course.icon as IconName} size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={typography.subheading} numberOfLines={2}>
                  {course.title}
                </Text>
                <Text style={typography.caption} numberOfLines={2}>
                  {course.description}
                </Text>
              </View>
              <Chevron />
            </View>
            <View style={styles.row}>
              <ProgressBar value={total ? done / total : 0} height={6} />
              <Text style={[typography.caption, styles.count]}>{t('courses.progress', { done, total })}</Text>
            </View>
          </Card>
        );
      })}
      <NewCourseCard />
    </>
  );
}

function NewCourseCard() {
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const configured = useAiConfigured();
  const generate = useGenerateCourse();
  const [topic, setTopic] = useState('');

  const submit = () => {
    const text = topic.trim();
    if (text.length < 2 || generate.isPending) return;
    generate.mutate(
      { topic: text, language: 'he' },
      {
        onSuccess: (course) => {
          haptics.success();
          setTopic('');
          router.push(`/course/${course.id}`);
        },
      },
    );
  };

  return (
    <Card style={styles.newCard}>
      <View style={styles.row}>
        <Ionicons name="sparkles" size={20} color={colors.primary} />
        <Text style={[typography.subheading, { flex: 1 }]}>{t('courses.newTitle')}</Text>
      </View>
      <Text style={typography.caption}>{t('courses.newBody')}</Text>
      <TextField
        value={topic}
        onChangeText={setTopic}
        placeholder={t('courses.newPlaceholder')}
        maxLength={200}
        editable={!generate.isPending}
        returnKeyType="go"
        onSubmitEditing={submit}
        accessibilityLabel={t('courses.newTitle')}
      />
      <InlineError message={!configured ? t('error.aiNotConfigured') : generate.error ? errorMessage(generate.error, t) : null} />
      {generate.isPending ? (
        <LoadingState label={t('courses.building')} />
      ) : (
        <Button label={t('courses.build')} icon="map-outline" onPress={submit} disabled={!configured || topic.trim().length < 2} />
      )}
    </Card>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: { minWidth: 48, textAlign: 'right' },
  newCard: { borderStyle: 'dashed', borderColor: colors.primary },
}));
