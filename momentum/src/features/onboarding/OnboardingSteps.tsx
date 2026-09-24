import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/components/theme';
import { GOALS, PRESETS, type GoalId } from '@/domain/presets';
import type { WizardState } from './wizardState';

function SelectableRow({
  title,
  subtitle,
  leading,
  selected,
  onPress,
}: {
  title: string;
  subtitle: string;
  leading: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}. ${subtitle}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && { opacity: 0.85 }]}
    >
      <Text style={styles.leading}>{leading}</Text>
      <View style={{ flex: 1 }}>
        <Text style={typography.label}>{title}</Text>
        <Text style={typography.caption}>{subtitle}</Text>
      </View>
      <View style={[styles.check, selected && styles.checkSelected]}>{selected ? <Text style={styles.checkMark}>✓</Text> : null}</View>
    </Pressable>
  );
}

export function GoalStep({ goal, onSelect }: { goal: GoalId | null; onSelect: (goal: GoalId) => void }) {
  return (
    <View style={styles.list}>
      <Text style={typography.title}>What do you want to improve?</Text>
      <Text style={styles.lead}>Pick one focus. You can add more habits later.</Text>
      {GOALS.map((g) => (
        <SelectableRow
          key={g.id}
          title={g.title}
          subtitle={g.subtitle}
          leading={g.emoji}
          selected={goal === g.id}
          onPress={() => onSelect(g.id)}
        />
      ))}
    </View>
  );
}

export function PresetStep({ state, onToggle }: { state: WizardState; onToggle: (key: string) => void }) {
  const presets = state.goal ? PRESETS[state.goal] : [];
  return (
    <View style={styles.list}>
      <Text style={typography.title}>Start with small wins</Text>
      <Text style={styles.lead}>Each habit comes with a tiny first step so starting takes seconds.</Text>
      {presets.map((preset) => (
        <SelectableRow
          key={preset.key}
          title={`${preset.habit.title} – ${preset.summary}`}
          subtitle={`First step: ${preset.habit.microStep}`}
          leading={preset.habit.isQuantitative ? '🔢' : '✅'}
          selected={state.selectedPresetKeys.includes(preset.key)}
          onPress={() => onToggle(preset.key)}
        />
      ))}
    </View>
  );
}

const PERMISSION_COPY: Record<WizardState['notificationStatus'], string> = {
  unknown: 'Allow notifications for focus-timer alerts and a gentle evening reflection reminder.',
  granted: 'Notifications are on. We’ll only ping you for timers and one evening check-in.',
  denied: 'No problem — Momentum works fully without notifications. You can enable them later in system settings.',
  unavailable: 'Notifications aren’t available on this device. Everything else works offline.',
};

export function NotificationStep({ state, habitCount }: { state: WizardState; habitCount: number }) {
  return (
    <View style={styles.list}>
      <Text style={typography.title}>You’re all set</Text>
      <Text style={styles.lead}>
        {habitCount} habit{habitCount === 1 ? '' : 's'} ready. Everything stays on this device — no account, no cloud.
      </Text>
      <View style={styles.infoBox}>
        <Text style={styles.infoEmoji}>🔔</Text>
        <Text style={[typography.body, { flex: 1 }]}>{PERMISSION_COPY[state.notificationStatus]}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  lead: { ...typography.body, color: colors.textMuted, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  rowSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  leading: { fontSize: 28 },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkMark: { color: colors.onPrimary, fontWeight: '700' },
  infoBox: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  infoEmoji: { fontSize: 28 },
});
