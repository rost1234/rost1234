import { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { Card } from '@/components/ui';
import { makeStyles, spacing, useTheme } from '@/components/theme';
import { runDetached, toErrorMessage } from '@/core/errors';
import { useSettingsStore } from '@/state/settingsStore';
import { useT } from '@/i18n';
import { TimeStepper } from './TimeStepper';

const DEFAULT_MINUTES = 21 * 60;

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
      {enabled ? <TimeStepper minutes={minutes} onChange={apply} /> : null}
      {note ? <Text style={[typography.caption, { color: colors.warning }]}>{note}</Text> : null}
    </Card>
  );
}

const useStyles = makeStyles(() => ({
  card: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
}));
