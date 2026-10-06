import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Card, InlineError, LoadingState, TextField } from '@/components/ui';
import { useGenerateCourse } from '@/data/courses';
import { useT } from '@/i18n';
import { useAiConfigured } from '@/lib/env';
import { errorMessage } from '@/lib/errors';
import { haptics } from '@/lib/haptics';
import { makeStyles, spacing, useTheme } from '@/theme';

/** "Build a course on any topic": the AI drafts a full path, saved on the device. */
export function NewCourseCard({ onCreated, autoFocus }: { onCreated?: (id: string) => void; autoFocus?: boolean }) {
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
          if (onCreated) onCreated(course.id);
          else router.push(`/course/${course.id}`);
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
        autoFocus={autoFocus}
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
  newCard: { borderStyle: 'dashed', borderColor: colors.primary },
}));
