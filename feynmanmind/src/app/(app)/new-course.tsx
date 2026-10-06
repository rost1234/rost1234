import { Text } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui';
import { NewCourseCard } from '@/features/learn/NewCourseCard';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

/** Build a course with the AI (opened from the "+" button). */
export default function NewCourseScreen() {
  const t = useT();
  const { typography } = useTheme();
  return (
    <Screen>
      <Text style={typography.body}>{t('quick.courseIntro')}</Text>
      <NewCourseCard autoFocus onCreated={(id) => router.replace(`/course/${id}`)} />
    </Screen>
  );
}
