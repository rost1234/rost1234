import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Card } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/components/theme';
import { runDetached, toErrorMessage } from '@/core/errors';
import { formatMinutesOfDay, stepMinutesOfDay } from '@/domain/usage';
import { useSettingsStore } from '@/state/settingsStore';

const STEP_MINUTES = 15;
const DEFAULT_MINUTES = 21 * 60;

function Stepper({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label === '−' ? 'Earlier' : 'Later'}
      onPress={onPress}
      hitSlop={8}
      style={styles.stepper}
    >
      <Text style={styles.stepperText}>{label}</Text>
    </Pressable>
  );
}

export function ReminderSetting() {
  const minutes = useSettingsStore((s) => s.settings?.reflectionReminderMinutes ?? null);
  const setReminder = useSettingsStore((s) => s.setReflectionReminder);
  const [note, setNote] = useState<string | null>(null);
  const enabled = minutes !== null;

  const apply = (next: number | null) =>
    runDetached(
      setReminder(next).then((scheduled) =>
        setNote(scheduled ? null : 'Saved, but notifications are blocked — enable them in system settings to get the reminder.'),
      ),
      (error) => setNote(`Couldn't update the reminder. ${toErrorMessage(error)}`),
    );

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={typography.label}>Evening reflection reminder</Text>
          <Text style={typography.caption}>One gentle nudge a day. Nothing else.</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={(on) => apply(on ? DEFAULT_MINUTES : null)}
          accessibilityLabel="Evening reflection reminder"
        />
      </View>
      {enabled ? (
        <View style={styles.timeRow}>
          <Stepper label="−" onPress={() => apply(stepMinutesOfDay(minutes, -STEP_MINUTES))} />
          <Text style={styles.time} accessibilityLabel={`Reminder at ${formatMinutesOfDay(minutes)}`}>
            {formatMinutesOfDay(minutes)}
          </Text>
          <Stepper label="+" onPress={() => apply(stepMinutesOfDay(minutes, STEP_MINUTES))} />
        </View>
      ) : null}
      {note ? <Text style={[typography.caption, { color: colors.warning }]}>{note}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
  time: { fontSize: 32, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'], minWidth: 100, textAlign: 'center' },
  stepper: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: { fontSize: 24, fontWeight: '700', color: colors.primary },
});
