import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import type { DailyReflection } from '@/domain/models';
import { MOOD_OPTIONS } from '@/features/reflection/mood';
import { useT } from '@/i18n';

export function ReflectionPrompt({ reflection }: { reflection: DailyReflection | null | undefined }) {
  const t = useT();
  const { typography } = useTheme();
  const styles = useStyles();
  const done = reflection != null;
  const mood = done ? MOOD_OPTIONS.find((m) => m.score === reflection.moodScore) : undefined;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={done ? t('reflect.editA11y') : t('reflect.startA11y')}
      onPress={() => router.push('/reflection')}
      style={({ pressed }) => [styles.card, done && styles.cardDone, pressed && { opacity: 0.85 }]}
    >
      <Text style={styles.emoji}>{mood?.emoji ?? '🌙'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={typography.label}>{done ? t('reflect.saved') : t('reflect.evening')}</Text>
        <Text style={typography.caption}>{done ? t('reflect.tapEdit') : t('reflect.quick')}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors, shadow }) => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },
  cardDone: { backgroundColor: colors.surface, ...shadow },
  emoji: { fontSize: 28 },
  chevron: { fontSize: 28, color: colors.textMuted },
}));
