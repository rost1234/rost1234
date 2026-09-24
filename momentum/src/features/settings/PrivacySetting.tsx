import { useState } from 'react';
import { Platform, Switch, Text, View } from 'react-native';
import { Button, Card } from '@/components/ui';
import { makeStyles, spacing, useTheme } from '@/components/theme';
import { runDetached, toErrorMessage } from '@/core/errors';
import { folderLabel } from '@/domain/autoBackup';
import { canLock, unlock } from '@/services/appLock';
import { backUpToFolder, chooseBackupFolder } from '@/services/backup';
import { useDevicePrefsStore } from '@/state/devicePrefsStore';
import { formatFriendlyDate } from '@/core/localDate';
import { useT } from '@/i18n';

/** Weekly backup into a folder the user picked (Android's storage access). */
export function AutoBackupSetting() {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const folder = useDevicePrefsStore((s) => s.backupFolderUri);
  const last = useDevicePrefsStore((s) => s.lastAutoBackup);
  const failed = useDevicePrefsStore((s) => s.autoBackupFailed);
  const update = useDevicePrefsStore((s) => s.update);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  if (Platform.OS !== 'android') return null;

  const run = (task: () => Promise<unknown>) => {
    setBusy(true);
    setNote(null);
    runDetached(
      task().finally(() => setBusy(false)),
      (error) => setNote(t('abk.failed', { error: toErrorMessage(error) })),
    );
  };

  return (
    <Card style={styles.card}>
      <Text style={typography.label}>{t('abk.title')}</Text>
      <Text style={typography.caption}>{folder ? t('abk.folder', { folder: folderLabel(folder) }) : t('abk.lead')}</Text>
      {folder && last ? <Text style={typography.caption}>{t('abk.last', { date: formatFriendlyDate(last, t.locale) })}</Text> : null}
      {failed ? <Text style={[typography.caption, { color: colors.warning }]}>{t('abk.lastFailed')}</Text> : null}
      {note ? <Text style={[typography.caption, { color: colors.warning }]}>{note}</Text> : null}
      {folder ? (
        <View style={styles.buttons}>
          <Button label={t('abk.now')} variant="secondary" loading={busy} onPress={() => run(backUpToFolder)} />
          <Button label={t('abk.off')} variant="ghost" onPress={() => update({ backupFolderUri: null, lastAutoBackup: null, autoBackupFailed: false })} />
        </View>
      ) : (
        <Button label={t('abk.choose')} variant="secondary" loading={busy} onPress={() => run(chooseBackupFolder)} />
      )}
    </Card>
  );
}

/** Optional fingerprint / PIN before reflections open. */
export function ReflectionLockSetting() {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const locked = useDevicePrefsStore((s) => s.lockReflections);
  const update = useDevicePrefsStore((s) => s.update);
  const [note, setNote] = useState<string | null>(null);

  const toggle = (on: boolean) =>
    runDetached(
      (async () => {
        if (on && !(await canLock())) {
          setNote(t('lock.unavailable'));
          return;
        }
        // Confirm with the same check, so nobody gets locked out by accident.
        if (await unlock()) {
          update({ lockReflections: on });
          setNote(null);
        }
      })(),
    );

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={typography.label}>{t('lock.setting')}</Text>
          <Text style={typography.caption}>{t('lock.settingLead')}</Text>
        </View>
        <Switch value={locked} onValueChange={toggle} accessibilityLabel={t('lock.setting')} />
      </View>
      {note ? <Text style={[typography.caption, { color: colors.warning }]}>{note}</Text> : null}
    </Card>
  );
}

const useStyles = makeStyles(() => ({
  card: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  buttons: { gap: spacing.sm },
}));
