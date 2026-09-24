import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, radius, shadow, spacing, typography } from '@/components/theme';
import { runDetached } from '@/core/errors';
import { haptics } from '@/core/haptics';
import { starterSuggestions } from '@/domain/presets';
import { useHabitStore } from '@/state/habitStore';

/** Instead of "nothing here": three one-tap starters and a way to browse more. */
export function EmptyHabits({ hasAnyHabits }: { hasAnyHabits: boolean }) {
  const addHabit = useHabitStore((s) => s.addHabit);
  const [added, setAdded] = useState<string[]>([]);
  const suggestions = starterSuggestions().filter((p) => !added.includes(p.key));

  return (
    <View style={styles.container}>
      <Text style={typography.body}>
        {hasAnyHabits ? 'Nothing scheduled today — enjoy the rest.' : 'Start with one tiny habit. Tap to add:'}
      </Text>
      {!hasAnyHabits
        ? suggestions.map((preset) => (
            <Pressable
              key={preset.key}
              accessibilityRole="button"
              accessibilityLabel={`Add ${preset.habit.title}`}
              onPress={() => {
                haptics.success();
                setAdded((keys) => [...keys, preset.key]);
                runDetached(addHabit(preset.habit));
              }}
              style={({ pressed }) => [styles.suggestion, pressed && { opacity: 0.8 }]}
            >
              <Ionicons name="add-circle" size={24} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={typography.label}>{preset.habit.title}</Text>
                <Text style={typography.caption}>
                  {preset.summary} · {preset.habit.microStep}
                </Text>
              </View>
            </Pressable>
          ))
        : null}
      <Pressable accessibilityRole="button" onPress={() => router.push('/habit/new')} hitSlop={8} style={styles.browse}>
        <Ionicons name="albums-outline" size={16} color={colors.primary} />
        <Text style={styles.browseText}>Browse templates or create your own</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadow,
  },
  browse: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm },
  browseText: { ...typography.label, color: colors.primary },
});
