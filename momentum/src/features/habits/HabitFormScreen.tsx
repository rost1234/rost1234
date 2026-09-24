import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { toErrorMessage } from '@/core/errors';
import { weekdayLabel, type Weekday } from '@/core/localDate';
import { Banner, Button, Chip } from '@/components/ui';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { ALL_WEEKDAYS, type Habit, type HabitReminder, type NewHabit, type TargetFrequency, type TimeOfDay } from '@/domain/models';
import type { HabitPreset } from '@/domain/presets';
import { useHabitStore } from '@/state/habitStore';
import { AtomicFields, type AtomicValues } from './AtomicFields';
import { RhythmFields } from './RhythmFields';
import { TemplatePicker } from './TemplatePicker';
import { useT } from '@/i18n';

function Field({ label, children }: { label: string; children: ReactNode }) {
  const { typography } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.field}>
      <Text style={typography.label}>{label}</Text>
      {children}
    </View>
  );
}

/** Create a habit, or edit `habit` in place (its history and streak are kept). */
export function HabitFormScreen({ habit }: { habit?: Habit }) {
  const t = useT();
  const { typography } = useTheme();
  const styles = useStyles();
  const addHabit = useHabitStore((s) => s.addHabit);
  const updateHabit = useHabitStore((s) => s.updateHabit);
  const [title, setTitle] = useState(habit?.title ?? '');
  const [microStep, setMicroStep] = useState(habit?.microStep ?? '');
  const [why, setWhy] = useState(habit?.why ?? '');
  const allHabits = useHabitStore((s) => s.habits);
  const anchors = allHabits.filter((h) => h.id !== habit?.id && h.afterHabitId !== habit?.id);
  const [atomic, setAtomic] = useState<AtomicValues>({
    growthMode: habit?.growthMode ?? 'maintain',
    goalText: habit?.goalCount ? String(habit.goalCount) : '',
    stepText: habit?.levelStep ? String(habit.levelStep) : '',
    cue: habit?.cue ?? '',
    pairing: habit?.pairing ?? '',
    afterHabitId: habit?.afterHabitId ?? null,
  });
  const patchAtomic = (patch: Partial<AtomicValues>) => setAtomic((current) => ({ ...current, ...patch }));
  // A yes/no habit that should grow becomes "minutes", starting tiny.
  const growBinary = () => {
    setIsQuantitative(true);
    setUnit((u) => u || t('form.defaultUnitMin'));
    setTargetText('2');
  };
  const [isQuantitative, setIsQuantitative] = useState(habit?.isQuantitative ?? false);
  const [targetText, setTargetText] = useState(habit?.isQuantitative ? String(habit.targetCount) : '4');
  const [unit, setUnit] = useState(habit?.unit ?? '');
  const [frequency, setFrequency] = useState<TargetFrequency>(habit?.targetFrequency ?? 'daily');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(habit?.timeOfDay ?? 'any');
  const [reminder, setReminder] = useState<HabitReminder>(habit?.reminder ?? 'off');
  const [days, setDays] = useState<Weekday[]>(
    habit?.targetFrequency === 'specific_days' ? habit.targetDays : [1, 2, 3, 4, 5],
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetCount = Number.parseInt(targetText, 10);
  const isValid =
    title.trim().length > 0 &&
    (!isQuantitative || (Number.isFinite(targetCount) && targetCount >= 1 && targetCount <= 999)) &&
    (frequency === 'daily' || days.length > 0);

  const applyTemplate = ({ habit: t }: HabitPreset) => {
    setTitle(t.title);
    setMicroStep(t.microStep);
    setIsQuantitative(t.isQuantitative);
    setTargetText(String(t.isQuantitative ? t.targetCount : 4));
    setUnit(t.unit);
    setFrequency(t.targetFrequency);
    if (t.targetFrequency === 'specific_days') setDays(t.targetDays);
  };

  const toggleDay = (day: Weekday) =>
    setDays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day]));

  const save = async () => {
    if (!isValid) return;
    const input: NewHabit = {
      title: title.trim(),
      microStep: microStep.trim(),
      isQuantitative,
      targetCount: isQuantitative ? targetCount : 1,
      unit: isQuantitative ? unit.trim() : '',
      targetFrequency: frequency,
      targetDays: frequency === 'specific_days' ? days : [],
      why: why.trim(),
      growthMode: atomic.growthMode,
      goalCount: atomic.growthMode === 'grow' && Number.parseInt(atomic.goalText, 10) > 0 ? Number.parseInt(atomic.goalText, 10) : null,
      levelStep: atomic.growthMode === 'grow' && Number.parseInt(atomic.stepText, 10) > 0 ? Number.parseInt(atomic.stepText, 10) : null,
      cue: atomic.cue.trim(),
      pairing: atomic.pairing.trim(),
      afterHabitId: atomic.afterHabitId,
      timeOfDay,
      reminder,
    };
    setIsSaving(true);
    try {
      if (habit) await updateHabit(habit.id, input);
      else await addHabit(input);
      router.back();
    } catch (e) {
      setError(t('form.saveError', { error: toErrorMessage(e) }));
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {error ? <Banner message={error} onDismiss={() => setError(null)} /> : null}
        {!habit ? <TemplatePicker onPick={applyTemplate} /> : null}
        <Field label={t('form.habit')}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={t('form.habitPh')}
            style={styles.input}
            maxLength={60}
            autoFocus={!habit}
          />
        </Field>
        <Field label={t('form.tinyStep')}>
          <TextInput
            value={microStep}
            onChangeText={setMicroStep}
            placeholder={t('form.tinyStepPh')}
            style={styles.input}
            maxLength={100}
          />
        </Field>
        <Field label={t('form.why')}>
          <TextInput
            value={why}
            onChangeText={setWhy}
            placeholder={t('form.whyPh')}
            style={styles.input}
            maxLength={120}
          />
        </Field>

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={typography.label}>{t('form.trackCount')}</Text>
            <Text style={typography.caption}>{t('form.trackCountHint')}</Text>
          </View>
          <Switch value={isQuantitative} onValueChange={setIsQuantitative} />
        </View>

        {isQuantitative ? (
          <View style={styles.inline}>
            <Field label={t('form.target')}>
              <TextInput value={targetText} onChangeText={setTargetText} keyboardType="number-pad" style={styles.input} maxLength={3} />
            </Field>
            <Field label={t('form.unit')}>
              <TextInput value={unit} onChangeText={setUnit} placeholder={t('form.unitPh')} style={styles.input} maxLength={20} />
            </Field>
          </View>
        ) : null}

        <AtomicFields
          values={atomic}
          onChange={patchAtomic}
          anchors={anchors}
          onGrowBinary={growBinary}
          isQuantitative={isQuantitative}
          unit={unit}
        />

        <Field label={t('form.schedule')}>
          <View style={styles.chips}>
            <Chip label={t('form.everyDay')} selected={frequency === 'daily'} onPress={() => setFrequency('daily')} />
            <Chip label={t('form.specificDays')} selected={frequency === 'specific_days'} onPress={() => setFrequency('specific_days')} />
          </View>
          {frequency === 'specific_days' ? (
            <View style={styles.chips}>
              {ALL_WEEKDAYS.map((day) => (
                <Chip key={day} label={weekdayLabel(day, t.locale)} selected={days.includes(day)} onPress={() => toggleDay(day)} />
              ))}
            </View>
          ) : null}
        </Field>

        <RhythmFields timeOfDay={timeOfDay} reminder={reminder} onTimeOfDay={setTimeOfDay} onReminder={setReminder} />

        {habit ? (
          <Text style={typography.caption}>{t('form.keptOnEdit')}</Text>
        ) : null}
        <Button label={habit ? t('form.saveChanges') : t('form.saveHabit')} onPress={() => void save()} disabled={!isValid} loading={isSaving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles(({ colors, typography }) => ({
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
}));
