import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toErrorMessage } from '@/core/errors';
import { Banner, Button, Card, SectionTitle } from '@/components/ui';
import { colors, spacing, typography } from '@/components/theme';
import { exportBackup } from '@/services/backup';
import { useSettingsStore } from '@/state/settingsStore';

export function SettingsScreen() {
  const freezes = useSettingsStore((s) => s.settings?.streakFreezesAvailable ?? 0);
  const [isExporting, setIsExporting] = useState(false);
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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={typography.title} accessibilityRole="header">
          Settings
        </Text>
        {message ? <Banner tone={message.tone} message={message.text} onDismiss={() => setMessage(null)} /> : null}

        <SectionTitle>Your data</SectionTitle>
        <Card style={styles.card}>
          <Text style={typography.body}>
            Everything lives only on this device. No account, no servers, no tracking.
          </Text>
          <Button label="Export backup (JSON)" variant="secondary" onPress={() => void runExport()} loading={isExporting} />
        </Card>

        <SectionTitle>Streak freezes</SectionTitle>
        <Card style={styles.card}>
          <Text style={typography.heading}>🧊 {freezes} available</Text>
          <Text style={typography.caption}>
            Miss a scheduled day and a freeze is used automatically to keep your streak alive — one freeze per missed day.
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
