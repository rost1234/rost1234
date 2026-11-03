import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Text';
import { Button } from '@/components/ui';
import { useT } from '@/i18n';
import { autoBackupIfDue, autoBackupSupported, daysSinceBackup, pickBackupFolder } from '@/services/backup';
import { usePrefsStore } from '@/state/prefsStore';
import { spacing, useTheme } from '@/theme';

/** The readable tail of a picked folder's address ("…/Documents/FeynmanMind"). */
function folderLabel(uri: string): string {
  const decoded = decodeURIComponent(uri);
  const tail = decoded.split(/[:/]/).filter(Boolean).slice(-2).join('/');
  return tail || decoded;
}

/**
 * Automatic weekly backup (Android): pick a folder once, e.g. Documents; the app writes a backup there
 * every week (on launch or when leaving the app) and keeps the newest five. The folder outlives the app.
 */
export function BackupSettings() {
  const t = useT();
  const { colors, typography } = useTheme();
  const backupDirUri = usePrefsStore((s) => s.backupDirUri);
  const lastBackupAt = usePrefsStore((s) => s.lastBackupAt);
  const set = usePrefsStore((s) => s.set);
  const [status, setStatus] = useState<'ok' | 'failed' | null>(null);
  const [now] = useState(() => new Date());
  const days = daysSinceBackup(lastBackupAt, now);

  const choose = async () => {
    const uri = await pickBackupFolder();
    if (!uri) return;
    set({ backupDirUri: uri });
    setStatus(autoBackupIfDue(true) ? 'ok' : 'failed');
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={typography.subheading}>{t('backup.autoTitle')}</Text>
      <Text style={typography.caption}>
        {days === null ? t('backup.never') : days === 0 ? t('backup.today') : t('backup.daysAgo', { n: days })}
      </Text>
      {autoBackupSupported ? (
        <>
          <Text style={typography.caption}>{backupDirUri ? t('backup.folder', { folder: folderLabel(backupDirUri) }) : t('backup.autoBody')}</Text>
          <Button label={backupDirUri ? t('backup.changeFolder') : t('backup.pickFolder')} variant="secondary" icon="folder-open-outline" onPress={() => void choose()} />
          {backupDirUri ? (
            <>
              <Button label={t('backup.now')} variant="secondary" icon="save-outline" onPress={() => setStatus(autoBackupIfDue(true) ? 'ok' : 'failed')} />
              <Button label={t('backup.off')} variant="ghost" icon="close-circle-outline" onPress={() => set({ backupDirUri: '' })} />
            </>
          ) : null}
          {status === 'ok' ? <Text style={[typography.caption, { color: colors.success }]}>{t('backup.saved')}</Text> : null}
          {status === 'failed' ? <Text style={[typography.caption, { color: colors.danger }]}>{t('backup.failed')}</Text> : null}
        </>
      ) : null}
    </View>
  );
}
