import { useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Card, InlineError, LoadingState, Screen, Segmented, Stepper, TextField } from '@/components/ui';
import { useGenerateFlashcards } from '@/data/study';
import { useT } from '@/i18n';
import { isAiConfigured } from '@/lib/env';
import { errorMessage } from '@/lib/errors';
import { formatBytes } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { PdfTooLargeError, pickPdf, type PickedPdf } from '@/lib/pdf';
import { usePrefsStore } from '@/state/prefsStore';
import { spacing, useTheme } from '@/theme';

// Must match the generate-flashcards Edge Function limits.
const MIN_TEXT = 200;
const MAX_TEXT = 60_000;

type Source = 'text' | 'pdf';

export default function GenerateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const { colors, typography } = useTheme();
  const generate = useGenerateFlashcards(id);
  const defaultCount = usePrefsStore((s) => s.defaultCardCount);
  const [source, setSource] = useState<Source>('text');
  const [text, setText] = useState('');
  const [pdf, setPdf] = useState<PickedPdf | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [count, setCount] = useState(defaultCount);
  const [result, setResult] = useState<{ cards: { id: string; question: string; answer: string }[]; source_truncated: boolean } | null>(null);

  const choosePdf = async () => {
    setPdfError(null);
    try {
      const picked = await pickPdf();
      if (picked) setPdf(picked);
    } catch (e) {
      setPdfError(e instanceof PdfTooLargeError ? t('error.payloadTooLarge') : t('error.generic'));
    }
  };

  const ready = source === 'text' ? text.trim().length >= MIN_TEXT : pdf !== null;

  const submit = () => {
    if (!ready) return;
    generate.mutate(
      { source: source === 'text' ? { text } : { pdfBase64: pdf!.base64 }, maxCards: count },
      {
        onSuccess: (res) => {
          haptics.success();
          setResult(res);
        },
      },
    );
  };

  if (result) {
    return (
      <Screen>
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <Ionicons name={result.cards.length ? 'checkmark-circle' : 'information-circle'} size={48} color={result.cards.length ? colors.success : colors.textMuted} />
          <Text style={[typography.heading, { textAlign: 'center' }]}>
            {result.cards.length ? t.plural('generate.created', result.cards.length) : t('generate.none')}
          </Text>
          {result.source_truncated ? <Text style={[typography.caption, { textAlign: 'center' }]}>{t('generate.truncated')}</Text> : null}
        </View>
        {result.cards.map((c) => (
          <Card key={c.id}>
            <Text style={[typography.body, { fontWeight: '600' }]}>{c.question}</Text>
            <Text style={[typography.body, { color: colors.textMuted }]}>{c.answer}</Text>
          </Card>
        ))}
        {result.cards.length ? (
          <Button label={t('generate.study')} icon="play" onPress={() => router.replace({ pathname: '/study', params: { conceptId: id } })} />
        ) : null}
        <Button label={t('generate.back')} variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={typography.body}>{t('generate.intro')}</Text>
      <Segmented
        value={source}
        onChange={setSource}
        options={[
          { value: 'text', label: t('generate.text') },
          { value: 'pdf', label: t('generate.pdf') },
        ]}
      />

      {source === 'text' ? (
        <TextField
          value={text}
          onChangeText={setText}
          placeholder={t('generate.textPlaceholder')}
          multiline
          maxLength={MAX_TEXT}
          style={{ minHeight: 240 }}
          accessibilityLabel={t('generate.text')}
          footer={t('generate.textCount', { count: text.length.toLocaleString(t.locale) })}
          editable={!generate.isPending}
        />
      ) : (
        <Card>
          {pdf ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Ionicons name="document-text" size={28} color={colors.primary} />
              <Text style={[typography.body, { flex: 1 }]} numberOfLines={2}>
                {t('generate.pdfInfo', { name: pdf.name, size: formatBytes(pdf.size) })}
              </Text>
            </View>
          ) : (
            <Text style={typography.caption}>{t('generate.pdfHint')}</Text>
          )}
          <Button
            label={pdf ? t('generate.changePdf') : t('generate.pickPdf')}
            icon="folder-open-outline"
            variant="secondary"
            onPress={() => void choosePdf()}
            disabled={generate.isPending}
          />
          <InlineError message={pdfError} />
        </Card>
      )}

      <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={typography.subheading}>{t('generate.count', { count })}</Text>
        <Stepper value={count} min={5} max={50} step={5} onChange={setCount} />
      </Card>

      <InlineError message={!isAiConfigured ? t('error.aiNotConfigured') : generate.error ? errorMessage(generate.error, t) : null} />

      {generate.isPending ? (
        <LoadingState label={t('generate.working')} />
      ) : (
        <Button label={t('generate.submit')} icon="sparkles" onPress={submit} disabled={!ready || !isAiConfigured} />
      )}
    </Screen>
  );
}
