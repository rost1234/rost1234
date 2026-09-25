import { Pressable, Text, View } from 'react-native';
import { makeStyles, radius, spacing } from '@/components/theme';
import { haptics } from '@/core/haptics';
import { formatMinutesOfDay, stepMinutesOfDay } from '@/domain/usage';
import { useT } from '@/i18n';

const STEP_MINUTES = 15;

function StepButton({ label, accessibilityLabel, small, onPress }: { label: string; accessibilityLabel: string; small?: boolean; onPress: () => void }) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      hitSlop={8}
      style={[styles.button, small && styles.buttonSmall]}
    >
      <Text style={[styles.buttonText, small && styles.buttonTextSmall]}>{label}</Text>
    </Pressable>
  );
}

/** − 21:00 + in 15-minute steps (wraps around midnight). */
export function TimeStepper({ minutes, onChange, small, label }: { minutes: number; onChange: (next: number) => void; small?: boolean; label?: string }) {
  const t = useT();
  const styles = useStyles();
  const time = formatMinutesOfDay(minutes);
  return (
    <View style={[styles.row, small && styles.rowSmall]}>
      <StepButton label="−" small={small} accessibilityLabel={t('rem.earlier')} onPress={() => onChange(stepMinutesOfDay(minutes, -STEP_MINUTES))} />
      <Text style={[styles.time, small && styles.timeSmall]} accessibilityLabel={label ? `${label} ${time}` : t('rem.at', { time })}>
        {time}
      </Text>
      <StepButton label="+" small={small} accessibilityLabel={t('rem.later')} onPress={() => onChange(stepMinutesOfDay(minutes, STEP_MINUTES))} />
    </View>
  );
}

/** − 4 + for small whole numbers. */
export function NumberStepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (next: number) => void; label: string }) {
  const styles = useStyles();
  return (
    <View style={[styles.row, styles.rowSmall]}>
      <StepButton label="−" small accessibilityLabel={`${label} −`} onPress={() => onChange(Math.max(min, value - 1))} />
      <Text style={[styles.time, styles.timeSmall, styles.number]} accessibilityLabel={`${label} ${value}`}>
        {value}
      </Text>
      <StepButton label="+" small accessibilityLabel={`${label} +`} onPress={() => onChange(Math.min(max, value + 1))} />
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
  rowSmall: { gap: spacing.sm },
  time: { fontSize: 32, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'], minWidth: 100, textAlign: 'center' },
  timeSmall: { fontSize: 18, minWidth: 58 },
  number: { minWidth: 28 },
  button: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSmall: { width: 34, height: 34 },
  buttonText: { fontSize: 24, fontWeight: '700', color: colors.primary },
  buttonTextSmall: { fontSize: 20 },
}));
