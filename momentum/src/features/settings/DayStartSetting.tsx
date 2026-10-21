import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/AppText';
import { Card, Chip } from '@/components/ui';
import { spacing, useTheme } from '@/components/theme';
import { runDetached } from '@/core/errors';
import { DAY_START_CHOICES, getDayStartHour } from '@/core/localDate';
import { useT } from '@/i18n';
import { saveDayStart } from '@/services/dayStart';
import { useHabitStore } from '@/state/habitStore';

export const dayStartLabel = (hour: number): string => `${String(hour).padStart(2, '0')}:00`;

/** When the app's day ends: until then, a late check-off or reflection still belongs to the evening. */
export function DayStartSetting() {
  const t = useT();
  const { typography } = useTheme();
  const [hour, setHour] = useState(getDayStartHour());
  const pick = (next: number) => {
    setHour(next);
    runDetached(
      saveDayStart(next).then(() => {
        // "Today" may have changed (e.g. at 01:00): reload so everything shows the right day.
        const today = useHabitStore.getState().today;
        if (today) return useHabitStore.getState().load(today);
        return undefined;
      }),
    );
  };
  return (
    <Card style={{ gap: spacing.sm }}>
      <Text style={typography.label}>{t('daystart.title')}</Text>
      {hour > 0 ? <Text style={typography.caption}>{t('daystart.lead')}</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }} accessibilityRole="radiogroup">
        {DAY_START_CHOICES.map((h) => (
          <Chip key={h} label={h === 0 ? t('daystart.midnight') : dayStartLabel(h)} selected={hour === h} onPress={() => pick(h)} />
        ))}
      </View>
    </Card>
  );
}
