import { StyleSheet, Switch, Text, View } from 'react-native';
import { Card, Chip } from '@/components/ui';
import { spacing, useTheme } from '@/components/theme';
import { weekdayLabel, type Weekday } from '@/core/localDate';
import { defaultWeekendDays } from '@/domain/dayOff';
import { useT } from '@/i18n';
import { usePrefsStore } from '@/state/prefsStore';

const WEEK: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

/** Which days Home switches to its lighter day-off layout. */
export function DayOffSetting() {
  const t = useT();
  const { typography } = useTheme();
  const enabled = usePrefsStore((s) => s.dayOffMode);
  const stored = usePrefsStore((s) => s.weekendDays);
  const holidays = usePrefsStore((s) => s.holidays) ?? t.language === 'he';
  const setDayOff = usePrefsStore((s) => s.setDayOff);
  const weekend = stored ?? defaultWeekendDays(t.language);

  const toggleDay = (day: Weekday) =>
    setDayOff({ weekendDays: weekend.includes(day) ? weekend.filter((d) => d !== day) : [...weekend, day].sort() });

  return (
    <>
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={typography.label}>{t('dayoff.setting')}</Text>
            <Text style={typography.caption}>{t('dayoff.settingLead')}</Text>
          </View>
          <Switch value={enabled} onValueChange={(on) => setDayOff({ dayOffMode: on })} accessibilityLabel={t('dayoff.setting')} />
        </View>
      </Card>
      {enabled ? (
        <Card style={styles.card}>
          <Text style={typography.label}>{t('dayoff.weekendDays')}</Text>
          <View style={styles.chips}>
            {WEEK.map((day) => (
              <Chip key={day} label={weekdayLabel(day, t.locale)} selected={weekend.includes(day)} onPress={() => toggleDay(day)} />
            ))}
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={typography.label}>{t('dayoff.holidays')}</Text>
              <Text style={typography.caption}>{t('dayoff.holidaysLead')}</Text>
            </View>
            <Switch value={holidays} onValueChange={(on) => setDayOff({ holidays: on })} accessibilityLabel={t('dayoff.holidays')} />
          </View>
          <Text style={typography.caption}>{t('dayoff.vacationNote')}</Text>
        </Card>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
