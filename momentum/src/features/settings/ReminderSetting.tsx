import { useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { Card } from '@/components/ui';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { runDetached, toErrorMessage } from '@/core/errors';
import { formatMinutesOfDay, stepMinutesOfDay } from '@/domain/usage';
import { useSettingsStore } from '@/state/settingsStore';
import { useT } from '@/i18n';

const STEP_MINUTES = 15;
const DEFAULT_MINUTES = 21 * 60;

function Stepper({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useT();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label === '−' ? t('rem.earlier') : t('rem.later')}
      onPress={onPress}
      hitSlop={8}
      style={styles.stepper}
    >
      <Text style={styles.stepperText}>{label}</Text>
    </Pressable>
  );
}

export function ReminderSetting() {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const minutes = useSettingsStore((s) => s.settings?.reflectionReminderMinutes ?? null);
  const setReminder = useSettingsStore((s) => s.setReflectionReminder);
  const [note, setNote] = useState<string | null>(null);
  const enabled = minutes !== null;

  const apply = (next: number | null) =>
    runDetached(
      setReminder(next).then((scheduled) =>
        setNote(scheduled ? null : t('rem.blocked')),
      ),
      (error) => setNote(t('rem.failed', { error: toErrorMessage(error) })),
    );

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={typography.label}>{t('rem.title')}</Text>
          <Text style={typography.caption}>{t('rem.lead')}</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={(on) => apply(on ? DEFAULT_MINUTES : null)}
          accessibilityLabel={t('rem.title')}
        />
      </View>
      {enabled ? (
        <View style={styles.timeRow}>
          <Stepper label="−" onPress={() => apply(stepMinutesOfDay(minutes, -STEP_MINUTES))} />
          <Text style={styles.time} accessibilityLabel={t('rem.at', { time: formatMinutesOfDay(minutes) })}>
            {formatMinutesOfDay(minutes)}
          </Text>
          <Stepper label="+" onPress={() => apply(stepMinutesOfDay(minutes, STEP_MINUTES))} />
        </View>
      ) : null}
      {note ? <Text style={[typography.caption, { color: colors.warning }]}>{note}</Text> : null}
    </Card>
  );
}

const useStyles = makeStyles(({ colors }) => ({
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
}));
