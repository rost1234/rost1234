import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from '@/components/AppText';
import { Chip } from '@/components/ui';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { runDetached } from '@/core/errors';
import { haptics } from '@/core/haptics';
import { weekdayLabel, type Weekday } from '@/core/localDate';
import { ALL_WEEKDAYS, type Habit } from '@/domain/models';
import { requestNotificationPermission } from '@/services/notifications';
import { useT, type TranslationKey } from '@/i18n';
import { TIMES, WORKDAYS, type HabitDraft } from './draft';

type Patch = (patch: Partial<HabitDraft>) => void;

const UNIT_KEYS: TranslationKey[] = ['hf.unitTimes', 'hf.unitMinutes', 'hf.unitPages', 'hf.unitGlasses'];

/** A number with − and + buttons, big enough to tap. */
export function Stepper({ value, onChange, min = 0, max = 999, step: by = 1, unit, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; unit: string; label: string }) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const step = (delta: number) => {
    const next = Math.max(min, Math.min(max, value + delta));
    if (next !== value) {
      haptics.select();
      onChange(next);
    }
  };
  return (
    <View style={styles.stepper} accessibilityLabel={label}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('hf.less', { label })} onPress={() => step(-by)} onLongPress={() => step(-5 * by)} style={styles.stepButton} disabled={value <= min}>
        <Ionicons name="remove" size={22} color={value <= min ? colors.border : colors.text} />
      </Pressable>
      <Text style={[typography.title, styles.stepValue]} accessibilityLiveRegion="polite" accessibilityLabel={`${value} ${unit}`}>
        {value}
      </Text>
      <Pressable accessibilityRole="button" accessibilityLabel={t('hf.more', { label })} onPress={() => step(by)} onLongPress={() => step(5 * by)} style={styles.stepButton} disabled={value >= max}>
        <Ionicons name="add" size={22} color={value >= max ? colors.border : colors.text} />
      </Pressable>
      <Text style={typography.body}>{unit}</Text>
    </View>
  );
}

/** Two big choices side by side (radio buttons). */
function Choice({ icon, label, selected, onPress }: { icon: string; label: string; selected: boolean; onPress: () => void }) {
  const { typography } = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={[styles.choice, selected && styles.choiceOn]}
    >
      <Text style={[typography.heading, selected && styles.onPrimary]}>{icon}</Text>
      <Text style={[typography.label, selected && styles.onPrimary]}>{label}</Text>
    </Pressable>
  );
}

/** "How much": done / not done, or an amount with a unit. */
export function AmountField({ draft, onChange }: { draft: HabitDraft; onChange: Patch }) {
  const t = useT();
  const { typography } = useTheme();
  const styles = useStyles();
  const units = UNIT_KEYS.map((k) => t(k));
  const custom = draft.unit.length > 0 && !units.includes(draft.unit);
  return (
    <View style={styles.group}>
      <View style={styles.row} accessibilityRole="radiogroup">
        <Choice icon="✓" label={t('hf.yesNo')} selected={!draft.isQuantitative} onPress={() => onChange({ isQuantitative: false, growthMode: 'maintain' })} />
        <Choice
          icon="5"
          label={t('hf.amount')}
          selected={draft.isQuantitative}
          onPress={() => onChange({ isQuantitative: true, targetCount: draft.targetCount > 1 ? draft.targetCount : 5, unit: draft.unit || t('hf.unitMinutes') })}
        />
      </View>
      {draft.isQuantitative ? (
        <>
          <Stepper value={draft.targetCount} min={1} onChange={(targetCount) => onChange({ targetCount })} unit={draft.unit} label={t('hf.howMuch')} />
          <Text style={typography.caption}>{t('hf.unit')}</Text>
          <View style={styles.chips}>
            {units.map((u) => (
              <Chip key={u} label={u} selected={draft.unit === u} onPress={() => onChange({ unit: u })} />
            ))}
          </View>
          <TextInput
            value={custom ? draft.unit : ''}
            onChangeText={(unit) => onChange({ unit })}
            placeholder={t('hf.unitOther')}
            accessibilityLabel={t('hf.unitOther')}
            style={styles.input}
            maxLength={20}
          />
        </>
      ) : null}
    </View>
  );
}

/** "When": every day or set days, and the part of the day. */
export function ScheduleField({ draft, onChange }: { draft: HabitDraft; onChange: Patch }) {
  const t = useT();
  const { typography } = useTheme();
  const styles = useStyles();
  const specific = draft.targetFrequency === 'specific_days';
  const toggleDay = (day: Weekday) => {
    const days = draft.targetDays.includes(day) ? draft.targetDays.filter((d) => d !== day) : [...draft.targetDays, day];
    onChange({ targetDays: days });
  };
  return (
    <View style={styles.group}>
      <Text style={typography.caption}>{t('hf.whichDays')}</Text>
      <View style={styles.chips}>
        <Chip label={t('form.everyDay')} selected={!specific} onPress={() => onChange({ targetFrequency: 'daily' })} />
        <Chip
          label={t('form.specificDays')}
          selected={specific}
          onPress={() => onChange({ targetFrequency: 'specific_days', targetDays: draft.targetDays.length > 0 ? draft.targetDays : WORKDAYS })}
        />
      </View>
      {specific ? (
        <View style={styles.chips}>
          {ALL_WEEKDAYS.map((day) => (
            <Chip key={day} label={weekdayLabel(day, t.locale)} selected={draft.targetDays.includes(day)} onPress={() => toggleDay(day)} />
          ))}
        </View>
      ) : null}
      {specific && draft.targetDays.length === 0 ? <Text style={typography.caption}>{t('hf.pickADay')}</Text> : null}
      <Text style={typography.caption}>{t('rhythm.partOfDay')}</Text>
      <View style={styles.chips}>
        {TIMES.map((p) => (
          <Chip key={p.id} label={t(p.key)} selected={draft.timeOfDay === p.id} onPress={() => onChange({ timeOfDay: p.id })} />
        ))}
      </View>
    </View>
  );
}

/** The smart reminder as a switch; turning it on asks for permission right then. */
export function ReminderSwitch({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  const t = useT();
  const { typography } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.switchRow}>
      <View style={{ flex: 1 }}>
        <Text style={typography.label}>{t('rhythm.reminder')}</Text>
        <Text style={typography.caption}>{t('rhythm.reminderHint')}</Text>
      </View>
      <Switch
        value={on}
        onValueChange={(next) => {
          onChange(next);
          if (next) runDetached(requestNotificationPermission());
        }}
        accessibilityLabel={t('rhythm.reminder')}
      />
    </View>
  );
}

/** A text box with ready answers under it as chips. */
export function TextWithIdeas({ value, onChange, placeholder, ideas, maxLength, label }: { value: string; onChange: (v: string) => void; placeholder: string; ideas: string[]; maxLength: number; label: string }) {
  const styles = useStyles();
  return (
    <View style={styles.group}>
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} accessibilityLabel={label} style={styles.input} maxLength={maxLength} />
      {ideas.length > 0 ? (
        <View style={styles.chips}>
          {ideas.map((idea) => (
            <Chip key={idea} label={idea} selected={value.trim() === idea} onPress={() => onChange(idea)} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** "After another habit": pick one of the other habits. */
export function AnchorField({ value, onChange, anchors }: { value: string | null; onChange: (id: string | null) => void; anchors: readonly Pick<Habit, 'id' | 'title'>[] }) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  if (anchors.length === 0) return <Text style={typography.body}>{t('hf.noAnchors')}</Text>;
  return (
    <View style={styles.group} accessibilityRole="radiogroup">
      {anchors.map((h) => {
        const selected = value === h.id;
        return (
          <Pressable
            key={h.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => {
              haptics.select();
              onChange(selected ? null : h.id);
            }}
            style={[styles.option, selected && styles.optionOn]}
          >
            <Text style={[typography.body, { flex: 1 }]}>{t('hf.afterX', { title: h.title })}</Text>
            {selected ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** "Grow little by little": where to start and where to get to. A yes/no habit becomes minutes. */
export function GrowField({ draft, onChange }: { draft: HabitDraft; onChange: Patch }) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const unit = draft.unit || t('hf.unitMinutes');
  const goal = draft.goalCount ?? Math.max(draft.targetCount * 4, draft.targetCount + 5);
  return (
    <View style={styles.group}>
      <Text style={typography.caption}>{t('hf.growFrom')}</Text>
      <Stepper value={draft.targetCount} min={1} onChange={(targetCount) => onChange({ targetCount, goalCount: Math.max(goal, targetCount + 1) })} unit={unit} label={t('hf.growFrom')} />
      <Text style={typography.caption}>{t('hf.growTo')}</Text>
      <Stepper value={goal} min={draft.targetCount + 1} onChange={(goalCount) => onChange({ goalCount })} unit={unit} label={t('hf.growTo')} />
      <View style={[styles.noteBox, { backgroundColor: colors.successSoft }]}>
        <Text style={typography.caption}>{t('atomic.growHint')}</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colors, typography }) => ({
  group: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  input: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepButton: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  stepValue: { minWidth: 48, textAlign: 'center' },
  choice: {
    flex: 1,
    minHeight: 84,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
  },
  choiceOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  onPrimary: { color: colors.onPrimary },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  optionOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  noteBox: { borderRadius: radius.md, padding: spacing.md },
}));
