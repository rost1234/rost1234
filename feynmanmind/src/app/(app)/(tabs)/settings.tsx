import { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { deleteAccount } from '@/api/functions';
import { Button, Card, InlineError, Screen, SectionHeader, Segmented, Stepper } from '@/components/ui';
import { useT } from '@/i18n';
import { confirmAsync } from '@/lib/dialogs';
import { errorMessage } from '@/lib/errors';
import { formatHour } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { ensureNotificationPermission, remindersSupported } from '@/services/reminders';
import { useDraftsStore } from '@/state/draftsStore';
import { usePrefsStore, type LanguagePref, type ThemePref } from '@/state/prefsStore';
import { spacing, useTheme } from '@/theme';

export default function SettingsScreen() {
  const t = useT();
  const { colors, typography } = useTheme();
  const prefs = usePrefsStore();
  const [languageChanged, setLanguageChanged] = useState(false);
  const [reminderDenied, setReminderDenied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleReminders = async (enabled: boolean) => {
    setReminderDenied(false);
    if (!enabled) return prefs.set({ remindersEnabled: false });
    const permission = await ensureNotificationPermission();
    if (permission === 'granted') prefs.set({ remindersEnabled: true });
    else setReminderDenied(true);
  };

  const removeAccount = async () => {
    const ok = await confirmAsync({
      title: t('settings.deleteConfirm.title'),
      message: t('settings.deleteConfirm.body'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount(supabase);
      // The user no longer exists server-side. Dropping the local session makes
      // AuthProvider start a fresh anonymous user; local drafts go too.
      useDraftsStore.setState({ drafts: {} });
      await supabase.auth.signOut({ scope: 'local' });
      setDeleting(false);
    } catch (e) {
      setError(errorMessage(e, t));
      setDeleting(false);
    }
  };

  return (
    <Screen>
      <SectionHeader title={t('settings.language')} />
      <Segmented<LanguagePref>
        value={prefs.language}
        onChange={(language) => {
          prefs.set({ language });
          setLanguageChanged(true);
        }}
        options={[
          { value: 'auto', label: t('settings.lang.auto') },
          { value: 'en', label: t('settings.lang.en') },
          { value: 'he', label: t('settings.lang.he') },
        ]}
      />
      {languageChanged ? <Text style={typography.caption}>{t('settings.langRestart')}</Text> : null}

      <SectionHeader title={t('settings.theme')} />
      <Segmented<ThemePref>
        value={prefs.theme}
        onChange={(theme) => prefs.set({ theme })}
        options={[
          { value: 'auto', label: t('settings.theme.auto') },
          { value: 'light', label: t('settings.theme.light') },
          { value: 'dark', label: t('settings.theme.dark') },
        ]}
      />

      <SectionHeader title={t('settings.reminders')} />
      <Card>
        {remindersSupported ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
              <Text style={[typography.body, { flex: 1 }]}>{t('settings.reminderToggle')}</Text>
              <Switch
                value={prefs.remindersEnabled}
                onValueChange={(v) => void toggleReminders(v)}
                trackColor={{ true: colors.primary, false: colors.border }}
                accessibilityLabel={t('settings.reminderToggle')}
              />
            </View>
            {prefs.remindersEnabled ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={typography.body}>{t('settings.reminderTime')}</Text>
                <Stepper value={prefs.reminderHour} min={0} max={23} onChange={(reminderHour) => prefs.set({ reminderHour })} format={(h) => formatHour(h, t)} />
              </View>
            ) : null}
            {reminderDenied ? <Text style={[typography.caption, { color: colors.danger }]}>{t('settings.reminderDenied')}</Text> : null}
          </>
        ) : (
          <Text style={typography.caption}>{t('settings.reminderUnavailable')}</Text>
        )}
      </Card>

      <SectionHeader title={t('settings.study')} />
      <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={[typography.body, { flex: 1 }]}>{t('settings.cardCount')}</Text>
        <Stepper value={prefs.defaultCardCount} min={5} max={50} step={5} onChange={(defaultCardCount) => prefs.set({ defaultCardCount })} />
      </Card>

      <SectionHeader title={t('settings.account')} />
      <Card>
        <Text style={typography.caption}>{t('settings.dataNote')}</Text>
        <Button label={t('settings.deleteAccount')} variant="danger" icon="trash-outline" onPress={() => void removeAccount()} loading={deleting} />
        <InlineError message={error} />
      </Card>

      <SectionHeader title={t('settings.about')} />
      <Card>
        <Button label={t('settings.howItWorks')} variant="ghost" icon="help-circle-outline" onPress={() => router.push('/how-it-works')} />
        <Text style={typography.caption}>{t('settings.privacy')}</Text>
        <Text style={typography.caption}>{t('settings.version', { version: Constants.expoConfig?.version ?? '1.0.0' })}</Text>
      </Card>
    </Screen>
  );
}
