import { useState } from 'react';
import { Text } from 'react-native';
import { testConnection, type ConnectionResult } from '@/api/functions';
import { Button, Card, TextField } from '@/components/ui';
import { useT, type TranslationKey } from '@/i18n';
import { normalizeAiUrl, useAiConfigured } from '@/lib/env';
import { usePrefsStore } from '@/state/prefsStore';
import { useTheme } from '@/theme';

const RESULT: Record<ConnectionResult, TranslationKey> = {
  ok: 'ai.ok',
  unreachable: 'ai.unreachable',
  not_found: 'ai.notFound',
  server_error: 'ai.serverError',
};

/** Where the AI tutor lives: a Supabase project URL and its publishable key, saved on this device. */
export function AiConnection() {
  const t = useT();
  const { colors, typography } = useTheme();
  const savedUrl = usePrefsStore((s) => s.aiUrl);
  const savedKey = usePrefsStore((s) => s.aiKey);
  const configured = useAiConfigured();
  const [url, setUrl] = useState(savedUrl);
  const [key, setKey] = useState(savedKey);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<ConnectionResult | null>(null);

  const saveAndTest = async () => {
    const config = { url: normalizeAiUrl(url), key: key.trim() };
    usePrefsStore.getState().set({ aiUrl: config.url, aiKey: config.key });
    setUrl(config.url);
    setResult(null);
    if (!config.url || !config.key) return;
    setTesting(true);
    setResult(await testConnection(config));
    setTesting(false);
  };

  return (
    <Card>
      <Text style={typography.caption}>{t('ai.intro')}</Text>
      <TextField
        label={t('ai.url')}
        value={url}
        onChangeText={setUrl}
        placeholder="https://xxxx.supabase.co"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        inputMode="url"
      />
      <TextField
        label={t('ai.key')}
        value={key}
        onChangeText={setKey}
        placeholder="sb_publishable_…"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Button label={t('ai.saveTest')} icon="flash-outline" variant="secondary" onPress={() => void saveAndTest()} loading={testing} disabled={!url.trim() || !key.trim()} />
      {result ? (
        <Text style={[typography.caption, { color: result === 'ok' ? colors.success : colors.danger }]} accessibilityLiveRegion="polite">
          {t(RESULT[result])}
        </Text>
      ) : !configured ? (
        <Text style={[typography.caption, { color: colors.warning }]}>{t('error.aiNotConfigured')}</Text>
      ) : null}
    </Card>
  );
}
