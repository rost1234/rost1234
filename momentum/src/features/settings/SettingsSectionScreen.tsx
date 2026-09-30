import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { SheetHeader } from '@/components/SheetHeader';
import { makeStyles, spacing } from '@/components/theme';
import { useBottomSpace } from '@/components/useBottomSpace';
import { type TranslationKey, useT } from '@/i18n';
import { AppearanceSetting } from './AppearanceSetting';
import { BackupSetting } from './BackupSetting';
import { DayOffSetting } from './DayOffSetting';
import { DataTransparency } from './DataTransparency';
import { NotificationSetting } from './NotificationSetting';
import { AutoBackupSetting, ReflectionLockSetting } from './PrivacySetting';
import { ReminderSetting } from './ReminderSetting';

export type SettingsSection = 'appearance' | 'dayoff' | 'notifications' | 'backup' | 'privacy';

const SECTIONS: Record<SettingsSection, { title: TranslationKey; content: () => ReactNode }> = {
  appearance: { title: 'set.sec.appearance', content: () => <AppearanceSetting /> },
  dayoff: { title: 'set.sec.dayoff', content: () => <DayOffSetting /> },
  notifications: {
    title: 'set.sec.notifications',
    content: () => (
      <>
        <NotificationSetting />
        <ReminderSetting />
      </>
    ),
  },
  backup: {
    title: 'set.sec.backup',
    content: () => (
      <>
        <BackupSetting />
        <AutoBackupSetting />
      </>
    ),
  },
  privacy: {
    title: 'set.sec.privacy',
    content: () => (
      <>
        <ReflectionLockSetting />
        <DataTransparency />
      </>
    ),
  },
};

export const isSettingsSection = (value: unknown): value is SettingsSection => typeof value === 'string' && value in SECTIONS;

/** One settings topic on its own screen (opened from the settings list). */
export function SettingsSectionScreen() {
  const t = useT();
  const styles = useStyles();
  const bottomSpace = useBottomSpace();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const current = SECTIONS[isSettingsSection(section) ? section : 'appearance'];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomSpace }]}>
        <SheetHeader title={t(current.title)} />
        <View style={{ gap: spacing.md }}>{current.content()}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
}));
