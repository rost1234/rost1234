import { useState } from 'react';
import { View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Text } from '@/components/Text';
import { Card } from '@/components/ui';
import { useT } from '@/i18n';
import { useDBStore } from '@/local/store';
import { autoBackupSupported, daysSinceBackup } from '@/services/backup';
import { usePrefsStore } from '@/state/prefsStore';
import { spacing, useTheme } from '@/theme';

/** Backups older than this get a reminder even with automatic backup on (it may have stopped working). */
const STALE_DAYS = 14;

/**
 * A nudge on Today when the library isn't safe: no automatic-backup folder yet (once there is something to
 * lose), or no backup for two weeks. Opens Me → settings.
 */
export function BackupReminder() {
  const t = useT();
  const { colors, typography } = useTheme();
  const backupDirUri = usePrefsStore((s) => s.backupDirUri);
  const lastBackupAt = usePrefsStore((s) => s.lastBackupAt);
  const hasData = useDBStore((s) => Object.keys(s.db.concepts).length >= 3);
  const [now] = useState(() => new Date());
  const days = daysSinceBackup(lastBackupAt, now);
  const noFolder = autoBackupSupported && !backupDirUri && hasData;
  const stale = hasData && days !== null && days >= STALE_DAYS;
  if (!noFolder && !stale) return null;
  return (
    <Card onPress={() => router.push('/me')} accessibilityLabel={t('backup.remindAction')}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Ionicons name="cloud-upload-outline" size={26} color={colors.warning} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={typography.subheading}>{t('backup.remindTitle')}</Text>
          <Text style={typography.caption}>{stale ? t('backup.remindOld', { n: days! }) : t('backup.remindNever')}</Text>
        </View>
        <Ionicons name={t.isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.textMuted} />
      </View>
    </Card>
  );
}
