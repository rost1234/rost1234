import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { toErrorMessage } from '@/core/errors';
import { Banner, Button, Card, SectionTitle } from '@/components/ui';
import { colors, spacing, typography } from '@/components/theme';
import { exportBackup, pickBackupFile, restoreBackup, type PendingImport } from '@/services/backup';
import { reloadAllData } from '@/state/reloadAll';
import { ReminderSetting } from './ReminderSetting';
import { useSettingsStore } from '@/state/settingsStore';

export function SettingsScreen() {
  const freezes = useSettingsStore((s) => s.settings?.streakFreezesAvailable ?? 0);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: 'info' | 'danger' } | null>(null);

  const runExport = async () => {
    setIsExporting(true);
    setMessage(null);
    try {
      const result = await exportBackup();
      setMessage({ tone: 'info', text: result.kind === 'shared' ? 'Backup exported.' : `Backup saved to ${result.uri}` });
    } catch (error) {
      setMessage({ tone: 'danger', text: `Export failed. ${toErrorMessage(error)}` });
    } finally {
      setIsExporting(false);
    }
  };

  const applyImport = async (pending: PendingImport) => {
    setIsImporting(true);
    try {
      await restoreBackup(pending);
      await reloadAllData();
      setMessage({ tone: 'info', text: 'Backup restored. A copy of your previous data was kept on this device.' });
      router.replace('/');
    } catch (error) {
      setMessage({ tone: 'danger', text: `Restore failed — nothing was changed. ${toErrorMessage(error)}` });
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
        setMessage({ tone: 'danger', text: picked.error });
        return;
      }
      const { counts, backup } = picked.pending;
      const exported = backup.exportedAt ? ` from ${backup.exportedAt.slice(0, 10)}` : '';
      Alert.alert(
        'Replace all data?',
        `This backup${exported} has ${counts.habits} habits, ${counts.habit_logs} habit logs, ${counts.tasks} tasks, ` +
          `${counts.focus_sessions} focus sessions and ${counts.daily_reflections} reflections.\n\n` +
          'Everything currently in the app will be replaced. A safety copy of your current data is saved first.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Replace', style: 'destructive', onPress: () => void applyImport(picked.pending) },
        ],
      );
    } catch (error) {
      setMessage({ tone: 'danger', text: `Couldn't read the file. ${toErrorMessage(error)}` });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={typography.title} accessibilityRole="header">
          Settings
        </Text>
        {message ? <Banner tone={message.tone} message={message.text} onDismiss={() => setMessage(null)} /> : null}

        <SectionTitle>Reminder</SectionTitle>
        <ReminderSetting />

        <SectionTitle>Your data</SectionTitle>
        <Card style={styles.card}>
          <Text style={typography.body}>
            Everything lives only on this device. No account, no servers, no tracking.
          </Text>
          <Button label="Export backup (JSON)" variant="secondary" onPress={() => void runExport()} loading={isExporting} />
          <Button label="Restore from backup" variant="ghost" onPress={() => void runImport()} loading={isImporting} />
        </Card>

        <SectionTitle>Streak freezes</SectionTitle>
        <Card style={styles.card}>
          <Text style={typography.heading}>🧊 {freezes} available</Text>
          <Text style={typography.caption}>
            Miss a scheduled day and a freeze is used automatically to keep your streak alive — one freeze per missed day.
            Every perfect week (7 days in a row with all habits done) earns a new freeze, up to 3.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  card: { gap: spacing.md },
});
