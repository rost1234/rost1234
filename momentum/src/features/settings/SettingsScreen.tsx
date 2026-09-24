import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { toErrorMessage } from '@/core/errors';
import { SheetHeader } from '@/components/SheetHeader';
import { Banner, Button, Card, SectionTitle } from '@/components/ui';
import { makeStyles, spacing, useTheme } from '@/components/theme';
import { exportBackup, pickBackupFile, restoreBackup, type PendingImport } from '@/services/backup';
import { reloadAllData } from '@/state/reloadAll';
import { AppearanceSetting } from './AppearanceSetting';
import { DataTransparency } from './DataTransparency';
import { PauseSetting } from './PauseSetting';
import { AutoBackupSetting, ReflectionLockSetting } from './PrivacySetting';
import { ReminderSetting } from './ReminderSetting';
import { useSettingsStore } from '@/state/settingsStore';
import { type TranslationKey, useT } from '@/i18n';

export function SettingsScreen() {
  const t = useT();
  const { typography } = useTheme();
  const styles = useStyles();
  const freezes = useSettingsStore((s) => s.settings?.streakFreezesAvailable ?? 0);
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
      Alert.alert(
        t('set.replaceTitle'),
        t('set.replaceBody', {
          from: exported,
          habits: counts.habits,
          logs: counts.habit_logs,
          tasks: counts.tasks,
          sessions: counts.focus_sessions,
          reflections: counts.daily_reflections,
        }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('set.replace'), style: 'destructive', onPress: () => void applyImport(picked.pending) },
        ],
      );
    } catch (error) {
      setMessage({ tone: 'danger', text: t('set.readFailed', { error: toErrorMessage(error) }) });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <SheetHeader title={t('set.title')} />
        {message ? <Banner tone={message.tone} message={message.text} onDismiss={() => setMessage(null)} /> : null}

        <SectionTitle>{t('app.title')}</SectionTitle>
        <AppearanceSetting />

        <SectionTitle>{t('set.reminder')}</SectionTitle>
        <ReminderSetting />

        <SectionTitle>{t('set.yourData')}</SectionTitle>
        <DataTransparency />
        <View style={{ height: spacing.md }} />
        <Card style={styles.card}>
          <Text style={typography.body}>
            {t('set.dataLead')}
          </Text>
          <Button label={t('set.export')} variant="secondary" onPress={() => void runExport()} loading={isExporting} />
          <Button label={t('set.restore')} variant="ghost" onPress={() => void runImport()} loading={isImporting} />
        </Card>
        <View style={{ height: spacing.md }} />
        <AutoBackupSetting />
        <View style={{ height: spacing.md }} />
        <ReflectionLockSetting />

        <SectionTitle>{t('set.breaks')}</SectionTitle>
        <PauseSetting />

        <SectionTitle>{t('set.freezes')}</SectionTitle>
        <Card style={styles.card}>
          <Text style={typography.heading}>{t('set.freezesAvailable', { count: freezes })}</Text>
          <Text style={typography.caption}>
            {t('set.freezesBody')}
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  card: { gap: spacing.md },
}));
