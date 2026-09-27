import { useState } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { showConfirm } from '@/components/Overlay';
import { Banner, Button, Card } from '@/components/ui';
import { spacing, useTheme } from '@/components/theme';
import { toErrorMessage } from '@/core/errors';
import { type TranslationKey, useT } from '@/i18n';
import { exportBackup, pickBackupFile, restoreBackup, type PendingImport } from '@/services/backup';
import { reloadAllData } from '@/state/reloadAll';

/** Manual export to a JSON file and restore from one (replaces everything, after a confirmation). */
export function BackupSetting() {
  const t = useT();
  const { typography } = useTheme();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: 'info' | 'danger' } | null>(null);

  const runExport = async () => {
    setIsExporting(true);
    setMessage(null);
    try {
      const result = await exportBackup();
      setMessage({ tone: 'info', text: result.kind === 'shared' ? t('set.exported') : t('set.savedTo', { uri: result.uri }) });
    } catch (error) {
      setMessage({ tone: 'danger', text: t('set.exportFailed', { error: toErrorMessage(error) }) });
    } finally {
      setIsExporting(false);
    }
  };

  const applyImport = async (pending: PendingImport) => {
    setIsImporting(true);
    try {
      await restoreBackup(pending);
      await reloadAllData();
      setMessage({ tone: 'info', text: t('set.restored') });
      router.replace('/');
    } catch (error) {
      setMessage({ tone: 'danger', text: t('set.restoreFailed', { error: toErrorMessage(error) }) });
    } finally {
      setIsImporting(false);
    }
  };

  const runImport = async () => {
    setMessage(null);
    setIsImporting(true);
    try {
      const picked = await pickBackupFile();
      if (picked.kind === 'canceled') return;
      if (picked.kind === 'invalid') {
        setMessage({ tone: 'danger', text: t(`backup.err.${picked.error.code}` as TranslationKey, { detail: picked.error.detail ?? '' }) });
        return;
      }
      const { counts, backup } = picked.pending;
      const exported = backup.exportedAt ? t('set.backupFrom', { date: backup.exportedAt.slice(0, 10) }) : '';
      showConfirm({
        title: t('set.replaceTitle'),
        message: t('set.replaceBody', {
          from: exported,
          habits: counts.habits,
          logs: counts.habit_logs,
          tasks: counts.tasks,
          sessions: counts.focus_sessions,
          reflections: counts.daily_reflections,
        }),
        confirmLabel: t('set.replace'),
        destructive: true,
        icon: 'cloud-download-outline',
        onConfirm: () => void applyImport(picked.pending),
      });
    } catch (error) {
      setMessage({ tone: 'danger', text: t('set.readFailed', { error: toErrorMessage(error) }) });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card style={{ gap: spacing.md }}>
      {message ? <Banner tone={message.tone} message={message.text} onDismiss={() => setMessage(null)} /> : null}
      <Text style={typography.body}>{t('set.dataLead')}</Text>
      <Button label={t('set.export')} variant="secondary" onPress={() => void runExport()} loading={isExporting} />
      <Button label={t('set.restore')} variant="ghost" onPress={() => void runImport()} loading={isImporting} />
    </Card>
  );
}
