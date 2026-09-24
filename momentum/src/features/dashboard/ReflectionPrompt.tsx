import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, radius, spacing, typography } from '@/components/theme';
import type { DailyReflection } from '@/domain/models';
import { MOOD_OPTIONS } from '@/features/reflection/mood';

export function ReflectionPrompt({ reflection }: { reflection: DailyReflection | null | undefined }) {
  const done = reflection != null;
  const mood = done ? MOOD_OPTIONS.find((m) => m.score === reflection.moodScore) : undefined;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={done ? 'Edit tonight’s reflection' : 'Start tonight’s 2-minute reflection'}
      onPress={() => router.push('/reflection')}
      style={({ pressed }) => [styles.card, done && styles.cardDone, pressed && { opacity: 0.85 }]}
    >
      <Text style={styles.emoji}>{mood?.emoji ?? '🌙'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={typography.label}>{done ? 'Reflection saved' : 'Evening reflection'}</Text>
        <Text style={typography.caption}>{done ? 'Tap to edit today’s entry' : '3 quick questions · 2 minutes'}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },
  cardDone: { backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  emoji: { fontSize: 28 },
  chevron: { fontSize: 28, color: colors.textMuted },
});
