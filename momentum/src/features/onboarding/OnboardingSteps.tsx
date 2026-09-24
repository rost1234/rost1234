import { Pressable, Text, View } from 'react-native';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { goals, presetsForGoal, type GoalId } from '@/domain/presets';
import type { TranslationKey } from '@/i18n';
import type { WizardState } from './wizardState';
import { useT } from '@/i18n';

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
  const { typography } = useTheme();
  const styles = useStyles();
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
  const t = useT();
  const { typography } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.list}>
      <Text style={typography.title}>{t('onb.goalTitle')}</Text>
      <Text style={styles.lead}>{t('onb.goalLead')}</Text>
      {goals(t.language).map((g) => (
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
  const t = useT();
  const { typography } = useTheme();
  const styles = useStyles();
  const presets = state.goal ? presetsForGoal(state.goal, t.language) : [];
  return (
    <View style={styles.list}>
      <Text style={typography.title}>{t('onb.presetTitle')}</Text>
      <Text style={styles.lead}>{t('onb.presetLead')}</Text>
      {presets.map((preset) => (
        <SelectableRow
          key={preset.key}
          title={`${preset.habit.title} – ${preset.summary}`}
          subtitle={t('onb.firstStep', { step: preset.habit.microStep })}
          leading={preset.habit.isQuantitative ? '🔢' : '✅'}
          selected={state.selectedPresetKeys.includes(preset.key)}
          onPress={() => onToggle(preset.key)}
        />
      ))}
    </View>
  );
}

const PERMISSION_COPY: Record<WizardState['notificationStatus'], TranslationKey> = {
  unknown: 'onb.perm.unknown',
  granted: 'onb.perm.granted',
  denied: 'onb.perm.denied',
  unavailable: 'onb.perm.unavailable',
};

export function NotificationStep({ state, habitCount }: { state: WizardState; habitCount: number }) {
  const t = useT();
  const { typography } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.list}>
      <Text style={typography.title}>{t('onb.allSet')}</Text>
      <Text style={styles.lead}>
        {t.plural('onb.ready', habitCount)}
      </Text>
      <View style={styles.infoBox}>
        <Text style={styles.infoEmoji}>🔔</Text>
        <Text style={[typography.body, { flex: 1 }]}>{t(PERMISSION_COPY[state.notificationStatus])}</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colors, typography }) => ({
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
}));
