import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { toErrorMessage } from '@/core/errors';
import { weekdayLabel, type Weekday } from '@/core/localDate';
import { Banner, Button, Chip } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/components/theme';
import { ALL_WEEKDAYS, type NewHabit, type TargetFrequency } from '@/domain/models';
import { useHabitStore } from '@/state/habitStore';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={typography.label}>{label}</Text>
      {children}
    </View>
  );
}

export function NewHabitScreen() {
  const addHabit = useHabitStore((s) => s.addHabit);
  const [title, setTitle] = useState('');
  const [microStep, setMicroStep] = useState('');
  const [isQuantitative, setIsQuantitative] = useState(false);
  const [targetText, setTargetText] = useState('4');
  const [unit, setUnit] = useState('');
  const [frequency, setFrequency] = useState<TargetFrequency>('daily');
  const [days, setDays] = useState<Weekday[]>([1, 2, 3, 4, 5]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetCount = Number.parseInt(targetText, 10);
  const isValid =
    title.trim().length > 0 &&
    (!isQuantitative || (Number.isFinite(targetCount) && targetCount >= 1 && targetCount <= 999)) &&
    (frequency === 'daily' || days.length > 0);

  const toggleDay = (day: Weekday) =>
    setDays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day]));

  const save = async () => {
    if (!isValid) return;
    const input: NewHabit = {
      title,
      microStep,
      isQuantitative,
      targetCount: isQuantitative ? targetCount : 1,
      unit: isQuantitative ? unit : '',
      targetFrequency: frequency,
      targetDays: frequency === 'specific_days' ? days : [],
    };
    setIsSaving(true);
    try {
      await addHabit(input);
      router.back();
    } catch (e) {
      setError(`Couldn't save habit. ${toErrorMessage(e)}`);
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {error ? <Banner message={error} onDismiss={() => setError(null)} /> : null}
        <Field label="Habit">
          <TextInput value={title} onChangeText={setTitle} placeholder="e.g. Stretch" style={styles.input} maxLength={60} autoFocus />
        </Field>
        <Field label="Tiny first step">
          <TextInput
            value={microStep}
            onChangeText={setMicroStep}
            placeholder="e.g. Roll out the mat"
            style={styles.input}
            maxLength={100}
          />
        </Field>

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={typography.label}>Track a count</Text>
            <Text style={typography.caption}>e.g. 4 glasses, 10 pages</Text>
          </View>
          <Switch value={isQuantitative} onValueChange={setIsQuantitative} />
        </View>

        {isQuantitative ? (
          <View style={styles.inline}>
            <Field label="Target">
              <TextInput value={targetText} onChangeText={setTargetText} keyboardType="number-pad" style={styles.input} maxLength={3} />
            </Field>
            <Field label="Unit">
              <TextInput value={unit} onChangeText={setUnit} placeholder="times" style={styles.input} maxLength={20} />
            </Field>
          </View>
        ) : null}

        <Field label="Schedule">
          <View style={styles.chips}>
            <Chip label="Every day" selected={frequency === 'daily'} onPress={() => setFrequency('daily')} />
            <Chip label="Specific days" selected={frequency === 'specific_days'} onPress={() => setFrequency('specific_days')} />
          </View>
          {frequency === 'specific_days' ? (
            <View style={styles.chips}>
              {ALL_WEEKDAYS.map((day) => (
                <Chip key={day} label={weekdayLabel(day)} selected={days.includes(day)} onPress={() => toggleDay(day)} />
              ))}
            </View>
          ) : null}
        </Field>

        <Button label="Save habit" onPress={() => void save()} disabled={!isValid} loading={isSaving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  field: { gap: spacing.sm, flex: 1 },
  input: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  inline: { flexDirection: 'row', gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
