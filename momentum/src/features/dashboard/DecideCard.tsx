import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, radius, spacing, typography } from '@/components/theme';
import { useTaskStore } from '@/state/taskStore';

/** Unfinished tasks never silently pile up: the user decides what happens to them. */
export function DecideCard() {
  const count = useTaskStore((s) => s.overdue.length);
  if (count === 0) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${count} unfinished tasks from earlier days. Decide what to do with them.`}
      onPress={() => router.push('/review')}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <Text style={styles.emoji}>📋</Text>
      <View style={{ flex: 1 }}>
        <Text style={typography.label}>
          {count} unfinished task{count === 1 ? '' : 's'} from earlier
        </Text>
        <Text style={typography.caption}>Today, Later or let it go — 30 seconds</Text>
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
    backgroundColor: colors.warningSoft,
    marginTop: spacing.lg,
  },
  emoji: { fontSize: 24 },
  chevron: { fontSize: 28, color: colors.textMuted },
});
