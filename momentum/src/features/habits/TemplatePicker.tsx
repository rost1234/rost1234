import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Chip } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/components/theme';
import { haptics } from '@/core/haptics';
import { TEMPLATE_GROUPS, type HabitPreset } from '@/domain/presets';

/** "Start from a template": pick a group, then a habit to pre-fill the form. */
export function TemplatePicker({ onPick }: { onPick: (preset: HabitPreset) => void }) {
  const [groupId, setGroupId] = useState<string | null>(null);
  const group = TEMPLATE_GROUPS.find((g) => g.id === groupId);

  return (
    <View style={styles.container}>
      <Text style={typography.overline}>Start from a template</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {TEMPLATE_GROUPS.map((g) => (
          <Chip
            key={g.id}
            label={`${g.emoji} ${g.title}`}
            selected={g.id === groupId}
            onPress={() => setGroupId(g.id === groupId ? null : g.id)}
          />
        ))}
      </ScrollView>
      {group
        ? group.presets.map((preset) => (
            <Pressable
              key={preset.key}
              accessibilityRole="button"
              onPress={() => {
                haptics.select();
                onPick(preset);
              }}
              style={({ pressed }) => [styles.item, pressed && { opacity: 0.8 }]}
            >
              <Text style={typography.label}>{preset.habit.title}</Text>
              <Text style={typography.caption}>
                {preset.summary} · {preset.habit.microStep}
              </Text>
            </Pressable>
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  row: { gap: spacing.sm, paddingVertical: spacing.xs },
  item: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
});
