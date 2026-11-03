import { useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { Text } from '@/components/Text';
import { Button } from '@/components/ui';
import { useT } from '@/i18n';
import { errorLogText, useErrorLog } from '@/services/errorLog';
import { spacing, useTheme } from '@/theme';

/** The on-device error log: how many, the latest, and a button to copy it all for a bug report. */
export function ErrorLogView() {
  const t = useT();
  const { typography, colors } = useTheme();
  const entries = useErrorLog((s) => s.entries);
  const clear = useErrorLog((s) => s.clear);
  const [copied, setCopied] = useState(false);
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={typography.subheading}>{t('errors.title')}</Text>
      {entries.length === 0 ? (
        <Text style={typography.caption}>{t('errors.none')}</Text>
      ) : (
        <>
          <Text style={typography.caption}>{t('errors.count', { n: entries.length })}</Text>
          <Text style={[typography.caption, { color: colors.danger }]} numberOfLines={3}>
            {`${entries[0]!.where}: ${entries[0]!.message}`}
          </Text>
          <Button
            label={copied ? t('errors.copied') : t('errors.copy')}
            variant="secondary"
            icon="copy-outline"
            onPress={() => void Clipboard.setStringAsync(errorLogText(entries, Constants.expoConfig?.version ?? '')).then(() => setCopied(true))}
          />
          <Button label={t('errors.clear')} variant="ghost" icon="trash-outline" onPress={clear} />
        </>
      )}
    </View>
  );
}

/** Samsung and other Android phones pause apps in the background; this opens the app's settings (Battery → Unrestricted). */
export function BatteryHint() {
  const t = useT();
  const { typography } = useTheme();
  if (Platform.OS !== 'android') return null;
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={typography.caption}>{t('battery.body')}</Text>
      <Button label={t('battery.open')} variant="ghost" icon="battery-charging-outline" onPress={() => void Linking.openSettings()} />
    </View>
  );
}
