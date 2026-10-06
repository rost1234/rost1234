import { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Collapsible, CollapsibleGroup } from '@/components/Collapsible';
import { Button, InlineError, Segmented, Stepper } from '@/components/ui';
import { AccessibilitySettings } from '@/features/me/AccessibilitySettings';
import { GoalSettings } from '@/features/me/GoalSettings';
import { ReviewSettings } from '@/features/review/ReviewSettings';
import { useAiConfigured } from '@/lib/env';
import { useT } from '@/i18n';
import { confirmAsync } from '@/lib/dialogs';
import { formatHour } from '@/lib/format';
import { useDBStore } from '@/local/store';
import { AiConnection } from './AiConnection';
import { emptyDB } from '@/local/types';
import { exportBackup, pickBackup } from '@/services/backup';
import { ensureNotificationPermission, remindersSupported } from '@/services/reminders';
import { useDraftsStore } from '@/state/draftsStore';
import { usePrefsStore, type LanguagePref, type ThemePref } from '@/state/prefsStore';
import { spacing, useTheme } from '@/theme';

/** All settings, in groups that open in place: goals, reviews, display, AI, data, about. */
export function SettingsContent() {
  const t = useT();
  const { colors, typography } = useTheme();
  const prefs = usePrefsStore();
  const aiReady = useAiConfigured();
  const [languageChanged, setLanguageChanged] = useState(false);
  const [reminderDenied, setReminderDenied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleReminders = async (enabled: boolean) => {
    setReminderDenied(false);
    if (!enabled) return prefs.set({ remindersEnabled: false });
    const permission = await ensureNotificationPermission();
    if (permission === 'granted') prefs.set({ remindersEnabled: true });
    else setReminderDenied(true);
  };

  const runDataAction = async (fn: () => Promise<string | null>) => {
    setNotice(null);
    setError(null);
    try {
      setNotice(await fn());
    } catch {
      setError(t('settings.backupFailed'));
    }
  };

  const exportData = () =>
    runDataAction(async () => {
      await exportBackup();
      return null;
    });

  const importData = () =>
    runDataAction(async () => {
      const db = await pickBackup();
      if (!db) return null;
      const ok = await confirmAsync({
        title: t('settings.importConfirm.title'),
        message: t('settings.importConfirm.body'),
        confirmLabel: t('settings.import'),
        cancelLabel: t('common.cancel'),
        destructive: true,
      });
      if (!ok) return null;
      useDBStore.getState().replace(db);
      return t('settings.imported');
    });

  const deleteAll = () =>
    runDataAction(async () => {
      const ok = await confirmAsync({
        title: t('settings.deleteConfirm.title'),
        message: t('settings.deleteConfirm.body'),
        confirmLabel: t('common.delete'),
        cancelLabel: t('common.cancel'),
        destructive: true,
      });
      if (!ok) return null;
      useDBStore.getState().replace(emptyDB());
      useDraftsStore.setState({ drafts: {} });
      return t('settings.deleted');
    });

  const textSizeLabel = t(prefs.textSize === 'normal' ? 'a11y.textNormal' : prefs.textSize === 'large' ? 'a11y.textLarge' : 'a11y.textXLarge');
  const themeLabel = t(`settings.theme.${prefs.theme}`);
  const row = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  } as const;

  return (
    <CollapsibleGroup>
      <Collapsible
        grouped
        icon="flag-outline"
        title={t('me.goalsGroup')}
        summary={
          prefs.remindersEnabled
            ? `${t('me.minutes', { n: prefs.dailyGoalMinutes })} · ${formatHour(prefs.reminderHour, t)}`
            : t('me.minutes', { n: prefs.dailyGoalMinutes })
        }
      >
        <GoalSettings />
        <Text style={typography.subheading}>{t('settings.reminders')}</Text>
        {remindersSupported ? (
          <>
            <View style={row}>
              <Text style={[typography.body, { flex: 1 }]}>{t('settings.reminderToggle')}</Text>
              <Switch
                value={prefs.remindersEnabled}
                onValueChange={(v) => void toggleReminders(v)}
                trackColor={{ true: colors.primary, false: colors.border }}
                accessibilityLabel={t('settings.reminderToggle')}
              />
            </View>
            {prefs.remindersEnabled ? (
              <View style={row}>
                <Text style={typography.body}>{t('settings.reminderTime')}</Text>
                <Stepper
                  value={prefs.reminderHour}
                  min={0}
                  max={23}
                  onChange={(reminderHour) => prefs.set({ reminderHour })}
                  format={(h) => formatHour(h, t)}
                />
              </View>
            ) : null}
            {reminderDenied ? <Text style={[typography.caption, { color: colors.danger }]}>{t('settings.reminderDenied')}</Text> : null}
          </>
        ) : (
          <Text style={typography.caption}>{t('settings.reminderUnavailable')}</Text>
        )}
      </Collapsible>

      <ReviewSettings grouped />

      <Collapsible grouped icon="text-outline" title={t('me.displayGroup')} summary={`${textSizeLabel} · ${themeLabel}`}>
        <Text style={typography.subheading}>{t('settings.language')}</Text>
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
        <Text style={typography.subheading}>{t('settings.theme')}</Text>
        <Segmented<ThemePref>
          value={prefs.theme}
          onChange={(theme) => prefs.set({ theme })}
          options={[
            { value: 'auto', label: t('settings.theme.auto') },
            { value: 'light', label: t('settings.theme.light') },
            { value: 'dark', label: t('settings.theme.dark') },
          ]}
        />
        <AccessibilitySettings />
      </Collapsible>

      <Collapsible grouped icon="sparkles-outline" title={t('ai.title')} summary={aiReady ? t('me.aiConnected') : t('me.aiOff')}>
        <AiConnection />
        <View style={row}>
          <Text style={[typography.body, { flex: 1 }]}>{t('settings.cardCount')}</Text>
          <Stepper value={prefs.defaultCardCount} min={5} max={50} step={5} onChange={(defaultCardCount) => prefs.set({ defaultCardCount })} />
        </View>
      </Collapsible>

      <Collapsible grouped icon="save-outline" title={t('me.dataGroup')} summary={t('me.dataSummary')}>
        <Text style={typography.caption}>{t('settings.dataNote')}</Text>
        <Button label={t('settings.export')} variant="secondary" icon="share-outline" onPress={() => void exportData()} />
        <Button label={t('settings.import')} variant="secondary" icon="download-outline" onPress={() => void importData()} />
        <Button label={t('settings.deleteAccount')} variant="danger" icon="trash-outline" onPress={() => void deleteAll()} />
        {notice ? (
          <Text style={[typography.caption, { color: colors.success }]} accessibilityLiveRegion="polite">
            {notice}
          </Text>
        ) : null}
        <InlineError message={error} />
      </Collapsible>

      <Collapsible grouped icon="information-circle-outline" title={t('settings.about')} summary={Constants.expoConfig?.version ?? ''}>
        <Button label={t('settings.howItWorks')} variant="ghost" icon="help-circle-outline" onPress={() => router.push('/how-it-works')} />
        <Text style={typography.caption}>{t('settings.privacy')}</Text>
        <Text style={typography.caption}>
          {t('settings.version', {
            version: Constants.expoConfig?.version ?? '1.0.0',
          })}
        </Text>
      </Collapsible>
    </CollapsibleGroup>
  );
}
