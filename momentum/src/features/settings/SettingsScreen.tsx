import type { ComponentProps } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { SheetHeader } from '@/components/SheetHeader';
import { SectionTitle } from '@/components/ui';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { useBottomSpace } from '@/components/useBottomSpace';
import { formatFriendlyDate } from '@/core/localDate';
import { activePause } from '@/domain/pauses';
import { formatMinutesOfDay } from '@/domain/usage';
import { useLocalDate } from '@/hooks/useLocalDate';
import { type TranslationKey, useT } from '@/i18n';
import { useDevicePrefsStore } from '@/state/devicePrefsStore';
import { useNotificationPrefsStore } from '@/state/notificationPrefsStore';
import { usePlanningStore } from '@/state/planningStore';
import { usePrefsStore } from '@/state/prefsStore';
import { useSettingsStore } from '@/state/settingsStore';

type IconName = ComponentProps<typeof Ionicons>['name'];

const THEME_LABEL = { system: 'app.system', light: 'app.light', dark: 'app.dark' } as const satisfies Record<string, TranslationKey>;
const LANGUAGE_LABEL = { auto: 'app.auto', en: 'app.english', he: 'app.hebrew' } as const satisfies Record<string, TranslationKey>;

function Row({
  icon,
  tint,
  title,
  status,
  warn,
  href,
  last,
}: {
  icon: IconName;
  tint: [string, string];
  title: string;
  status: string;
  warn?: boolean;
  href: Href;
  last?: boolean;
}) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${status}`}
      onPress={() => router.push(href)}
      style={({ pressed }) => [styles.row, !last && styles.divider, pressed && { backgroundColor: colors.surfaceMuted }]}
    >
      <View style={[styles.icon, { backgroundColor: tint[0] }]}>
        <Ionicons name={icon} size={20} color={tint[1]} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={typography.label}>{title}</Text>
        <Text style={[typography.caption, warn && { color: colors.warning }]} numberOfLines={2}>
          {status}
        </Text>
      </View>
      <Ionicons name={t.isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textMuted} />
    </Pressable>
  );
}

/** Settings as a short list of topics; each opens its own screen. */
export function SettingsScreen() {
  const t = useT();
  const { colors } = useTheme();
  const styles = useStyles();
  const bottomSpace = useBottomSpace();
  const today = useLocalDate();
  const theme = usePrefsStore((s) => s.theme);
  const language = usePrefsStore((s) => s.language);
  const dailyLimit = useNotificationPrefsStore((s) => s.dailyLimit);
  const quietStart = useNotificationPrefsStore((s) => s.quietStart);
  const quietEnd = useNotificationPrefsStore((s) => s.quietEnd);
  const freezes = useSettingsStore((s) => s.settings?.streakFreezesAvailable ?? 0);
  const pause = activePause(usePlanningStore((s) => s.pauses), today);
  const backupFolder = useDevicePrefsStore((s) => s.backupFolderUri);
  const lastBackup = useDevicePrefsStore((s) => s.lastAutoBackup);
  const backupFailed = useDevicePrefsStore((s) => s.autoBackupFailed);
  const locked = useDevicePrefsStore((s) => s.lockReflections);

  const streakStatus = [t.plural('today.freezes', freezes), pause ? t('protect.pausedUntil', { date: formatFriendlyDate(pause.endDate, t.locale) }) : null]
    .filter(Boolean)
    .join(' · ');
  const backupStatus = backupFailed
    ? t('set.st.backupFailed')
    : backupFolder
      ? lastBackup
        ? t('set.st.backupAutoLast', { date: formatFriendlyDate(lastBackup, t.locale) })
        : t('set.st.backupAuto')
      : t('set.st.backupManual');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomSpace }]}>
        <SheetHeader title={t('set.title')} />

        <SectionTitle>{t('set.group.general')}</SectionTitle>
        <View style={styles.group}>
          <Row
            icon="color-palette-outline"
            tint={[colors.primarySoft, colors.primary]}
            title={t('set.sec.appearance')}
            status={`${t(THEME_LABEL[theme])} · ${t(LANGUAGE_LABEL[language])}`}
            href="/settings/appearance"
          />
          <Row
            icon="notifications-outline"
            tint={[colors.warningSoft, colors.warning]}
            title={t('set.sec.notifications')}
            status={t.plural('set.st.notifications', dailyLimit, { from: formatMinutesOfDay(quietStart), to: formatMinutesOfDay(quietEnd) })}
            href="/settings/notifications"
            last
          />
        </View>

        <SectionTitle>{t('set.breaks')}</SectionTitle>
        <View style={styles.group}>
          <Row
            icon="shield-checkmark-outline"
            tint={[colors.freezeSoft, colors.freeze]}
            title={t('protect.title')}
            status={streakStatus}
            href="/streaks"
            last
          />
        </View>

        <SectionTitle>{t('set.yourData')}</SectionTitle>
        <View style={styles.group}>
          <Row
            icon="cloud-upload-outline"
            tint={[colors.successSoft, colors.success]}
            title={t('set.sec.backup')}
            status={backupStatus}
            warn={backupFailed}
            href="/settings/backup"
          />
          <Row
            icon="lock-closed-outline"
            tint={[colors.surfaceMuted, colors.text]}
            title={t('set.sec.privacy')}
            status={locked ? t('set.st.privacyLocked') : t('set.st.privacyOpen')}
            href="/settings/privacy"
            last
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors, shadow }) => ({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  group: { borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden', ...shadow },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 64 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  icon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
}));
