import { Switch, Text, View } from 'react-native';
import { Chip } from '@/components/ui';
import { makeStyles, spacing, useTheme } from '@/components/theme';
import type { HabitReminder, TimeOfDay } from '@/domain/models';
import { runDetached } from '@/core/errors';
import { useT } from '@/i18n';
import { requestNotificationPermission } from '@/services/notifications';

const PARTS: { id: TimeOfDay; key: 'rhythm.any' | 'rhythm.morning' | 'rhythm.afternoon' | 'rhythm.evening' }[] = [
  { id: 'any', key: 'rhythm.any' },
  { id: 'morning', key: 'rhythm.morning' },
  { id: 'afternoon', key: 'rhythm.afternoon' },
  { id: 'evening', key: 'rhythm.evening' },
];

interface RhythmFieldsProps {
  timeOfDay: TimeOfDay;
  reminder: HabitReminder;
  onTimeOfDay: (value: TimeOfDay) => void;
  onReminder: (value: HabitReminder) => void;
}

/** When in the day the habit belongs, and an optional reminder at the usual time. */
export function RhythmFields({ timeOfDay, reminder, onTimeOfDay, onReminder }: RhythmFieldsProps) {
  const t = useT();
  const { typography } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.container}>
      <Text style={typography.label}>{t('rhythm.partOfDay')}</Text>
      <View style={styles.chips}>
        {PARTS.map((p) => (
          <Chip key={p.id} label={t(p.key)} selected={timeOfDay === p.id} onPress={() => onTimeOfDay(p.id)} />
        ))}
      </View>
      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={typography.label}>{t('rhythm.reminder')}</Text>
          <Text style={typography.caption}>{t('rhythm.reminderHint')}</Text>
        </View>
        <Switch
          value={reminder === 'smart'}
          onValueChange={(on) => {
            onReminder(on ? 'smart' : 'off');
            // Ask once, right when it's needed.
            if (on) runDetached(requestNotificationPermission());
          }}
          accessibilityLabel={t('rhythm.reminder')}
        />
      </View>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  container: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
}));
