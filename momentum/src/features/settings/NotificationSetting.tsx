import { useEffect, useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { Button, Card } from '@/components/ui';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { runDetached } from '@/core/errors';
import { addDays, getWeekday, weekdayLabel, type LocalDateString } from '@/core/localDate';
import { DAILY_LIMIT_RANGE, type PlannedNotification } from '@/domain/notificationPlan';
import { formatMinutesOfDay } from '@/domain/usage';
import { hasPermission, requestNotificationPermission } from '@/services/notifications';
import { describePlanned, requestNotificationSync, upcomingPlan } from '@/services/notificationPlanner';
import { useHabitStore } from '@/state/habitStore';
import { useNotificationPrefsStore } from '@/state/notificationPrefsStore';
import { useReflectionStore } from '@/state/reflectionStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useT } from '@/i18n';
import { NumberStepper, TimeStepper } from './TimeStepper';

const PREVIEW_COUNT = 4;

function ToggleRow({ title, lead, value, onChange }: { title: string; lead: string; value: boolean; onChange: (on: boolean) => void }) {
  const { typography } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={typography.label}>{title}</Text>
        <Text style={typography.caption}>{lead}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} accessibilityLabel={title} />
    </View>
  );
}

function useDayLabel() {
  const t = useT();
  return (date: LocalDateString, today: LocalDateString) => {
    if (date === today) return t('sn.today');
    if (date === addDays(today, 1)) return t('sn.tomorrow');
    return weekdayLabel(getWeekday(date), t.locale);
  };
}

/** What the planner will send next, so the user can see (and trust) it. */
function ComingUp() {
  const t = useT();
  const { typography } = useTheme();
  const styles = useStyles();
  const dayLabel = useDayLabel();
  // Re-render when anything the plan depends on changes.
  const habits = useHabitStore((s) => s.habits);
  const today = useHabitStore((s) => s.today);
  useHabitStore((s) => s.logs);
  useReflectionStore((s) => s.byDate);
  useSettingsStore((s) => s.settings?.reflectionReminderMinutes);
  useNotificationPrefsStore();
  const items: PlannedNotification[] = upcomingPlan().slice(0, PREVIEW_COUNT);

  return (
    <View style={styles.preview}>
      <Text style={typography.label}>{t('sn.comingUp')}</Text>
      {items.length === 0 || !today ? (
        <Text style={typography.caption}>{t('sn.nothing')}</Text>
      ) : (
        items.map((item) => (
          <View key={`${item.kind}-${item.date}-${item.minutes}`} style={styles.previewRow}>
            <Text style={styles.previewWhen}>
              {dayLabel(item.date, today)} {formatMinutesOfDay(item.minutes)}
            </Text>
            <Text style={[typography.caption, { flex: 1 }]} numberOfLines={1}>
              {describePlanned(item, habits).title}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

export function NotificationSetting() {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const prefs = useNotificationPrefsStore();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    runDetached(hasPermission().then(setAllowed));
  }, []);

  const ask = () =>
    runDetached(
      requestNotificationPermission().then((result) => {
        setAllowed(result === 'granted');
        if (result === 'granted') requestNotificationSync(0);
      }),
    );

  return (
    <Card style={styles.card}>
      <View>
        <Text style={typography.label}>{t('sn.title')}</Text>
        <Text style={typography.caption}>{t('sn.lead')}</Text>
      </View>

      {allowed === false ? (
        <View style={styles.blocked}>
          <Text style={[typography.caption, { color: colors.warning }]}>{t('sn.blocked')}</Text>
          <Button label={t('sn.allow')} variant="secondary" onPress={ask} />
        </View>
      ) : null}

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={typography.label}>{t('sn.quiet')}</Text>
          <Text style={typography.caption}>{t('sn.quietLead')}</Text>
        </View>
      </View>
      <View style={styles.quietRow}>
        <TimeStepper small label={t('sn.from')} minutes={prefs.quietStart} onChange={(quietStart) => prefs.update({ quietStart })} />
        <Text style={typography.caption}>→</Text>
        <TimeStepper small label={t('sn.to')} minutes={prefs.quietEnd} onChange={(quietEnd) => prefs.update({ quietEnd })} />
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={typography.label}>{t('sn.limit')}</Text>
          <Text style={typography.caption}>{t('sn.limitLead')}</Text>
        </View>
        <NumberStepper
          label={t('sn.limit')}
          value={prefs.dailyLimit}
          min={DAILY_LIMIT_RANGE.min}
          max={DAILY_LIMIT_RANGE.max}
          onChange={(dailyLimit) => prefs.update({ dailyLimit })}
        />
      </View>

      <ToggleRow title={t('sn.rescue')} lead={t('sn.rescueLead')} value={prefs.streakRescue} onChange={(streakRescue) => prefs.update({ streakRescue })} />
      {prefs.streakRescue ? (
        <TimeStepper small minutes={prefs.rescueMinutes} onChange={(rescueMinutes) => prefs.update({ rescueMinutes })} />
      ) : null}

      <ToggleRow title={t('sn.checkin')} lead={t('sn.checkinLead')} value={prefs.checkIn} onChange={(checkIn) => prefs.update({ checkIn })} />
      {prefs.checkIn ? (
        <TimeStepper small minutes={prefs.checkInMinutes} onChange={(checkInMinutes) => prefs.update({ checkInMinutes })} />
      ) : null}

      <ToggleRow title={t('sn.morning')} lead={t('sn.morningLead')} value={prefs.morningPlan} onChange={(morningPlan) => prefs.update({ morningPlan })} />
      {prefs.morningPlan ? (
        <TimeStepper small minutes={prefs.morningMinutes} onChange={(morningMinutes) => prefs.update({ morningMinutes })} />
      ) : null}

      <Text style={typography.caption}>{t('sn.perHabit')}</Text>
      <ComingUp />
    </Card>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  card: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  quietRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  blocked: { gap: spacing.sm },
  preview: { gap: spacing.xs, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  previewWhen: { fontSize: 13, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'], minWidth: 96 },
}));
