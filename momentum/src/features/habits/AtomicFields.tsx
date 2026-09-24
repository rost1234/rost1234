import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Chip } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/components/theme';
import type { GrowthMode, Habit } from '@/domain/models';

export interface AtomicValues {
  growthMode: GrowthMode;
  goalText: string;
  stepText: string;
  cue: string;
  pairing: string;
  afterHabitId: string | null;
}

interface AtomicFieldsProps {
  values: AtomicValues;
  onChange: (patch: Partial<AtomicValues>) => void;
  /** Other active habits that this one can be stacked after. */
  anchors: readonly Pick<Habit, 'id' | 'title'>[];
  /** Called when "Grow" is picked on a yes/no habit, so the form can switch it to minutes. */
  onGrowBinary: () => void;
  isQuantitative: boolean;
  unit: string;
}

/** The four laws of Atomic Habits + habit stacking, all optional. */
export function AtomicFields({ values, onChange, anchors, onGrowBinary, isQuantitative, unit }: AtomicFieldsProps) {
  const chooseGrow = () => {
    if (!isQuantitative) onGrowBinary();
    onChange({ growthMode: 'grow' });
  };

  return (
    <View style={styles.container}>
      <Text style={typography.overline}>Atomic habits (optional)</Text>

      <View style={styles.field}>
        <Text style={typography.label}>Level</Text>
        <View style={styles.chips}>
          <Chip label="Maintain — keep it steady" selected={values.growthMode === 'maintain'} onPress={() => onChange({ growthMode: 'maintain' })} />
          <Chip label="Grow — start tiny, level up" selected={values.growthMode === 'grow'} onPress={chooseGrow} />
        </View>
        {values.growthMode === 'grow' ? (
          <View style={styles.inline}>
            <View style={styles.flex}>
              <Text style={typography.caption}>Long-term goal ({unit || 'count'})</Text>
              <TextInput value={values.goalText} onChangeText={(goalText) => onChange({ goalText })} keyboardType="number-pad" style={styles.input} maxLength={3} placeholder="e.g. 20" />
            </View>
            <View style={styles.flex}>
              <Text style={typography.caption}>Step up by</Text>
              <TextInput value={values.stepText} onChangeText={(stepText) => onChange({ stepText })} keyboardType="number-pad" style={styles.input} maxLength={3} placeholder="auto" />
            </View>
          </View>
        ) : null}
        {values.growthMode === 'grow' ? (
          <Text style={typography.caption}>After a strong week you’ll be offered the next level — you always decide.</Text>
        ) : null}
      </View>

      <View style={styles.field}>
        <Text style={typography.label}>When & where (make it obvious)</Text>
        <TextInput value={values.cue} onChangeText={(cue) => onChange({ cue })} placeholder="e.g. After breakfast, at the kitchen table" style={styles.input} maxLength={80} />
      </View>

      <View style={styles.field}>
        <Text style={typography.label}>Pair it with (make it attractive)</Text>
        <TextInput value={values.pairing} onChangeText={(pairing) => onChange({ pairing })} placeholder="e.g. Favourite podcast while walking" style={styles.input} maxLength={80} />
      </View>

      {anchors.length > 0 ? (
        <View style={styles.field}>
          <Text style={typography.label}>Stack it after…</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            <Chip label="No anchor" selected={values.afterHabitId === null} onPress={() => onChange({ afterHabitId: null })} />
            {anchors.map((h) => (
              <Chip key={h.id} label={h.title} selected={values.afterHabitId === h.id} onPress={() => onChange({ afterHabitId: h.id })} />
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  field: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row: { gap: spacing.sm, paddingVertical: spacing.xs },
  inline: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1, gap: spacing.xs },
  input: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
});
