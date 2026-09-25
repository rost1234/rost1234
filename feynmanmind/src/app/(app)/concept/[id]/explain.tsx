import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { FeynmanEvaluation } from '@/api/functions';
import { Button, Card, ErrorState, InlineError, LoadingState, Screen, TextField } from '@/components/ui';
import { useConcept } from '@/data/concepts';
import { useEvaluateExplanation, useSessions } from '@/data/sessions';
import { EvaluationView } from '@/features/feynman/EvaluationView';
import { useT } from '@/i18n';
import { isAiConfigured } from '@/lib/env';
import { errorMessage } from '@/lib/errors';
import { haptics } from '@/lib/haptics';
import { useDraftsStore } from '@/state/draftsStore';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

// Must match the feynman-evaluate Edge Function limits.
const MIN_CHARS = 20;
const MAX_CHARS = 8000;

export default function ExplainScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const concept = useConcept(id);
  const sessions = useSessions(id);
  const evaluate = useEvaluateExplanation(id);
  const draft = useDraftsStore((s) => s.drafts[id] ?? '');
  const setDraft = useDraftsStore((s) => s.setDraft);
  const clearDraft = useDraftsStore((s) => s.clearDraft);
  const [result, setResult] = useState<{ response: { evaluation: FeynmanEvaluation }; explanation: string } | null>(null);
  const [touched, setTouched] = useState(false);

  if (concept.isPending) return <LoadingState />;
  if (concept.isError) return <ErrorState message={errorMessage(concept.error, t)} onRetry={() => void concept.refetch()} />;

  const text = draft.trim();
  const tooShort = text.length < MIN_CHARS;
  const lastQuestion = sessions.data?.[0]?.socratic_question;

  const submit = () => {
    setTouched(true);
    if (tooShort || evaluate.isPending) return;
    evaluate.mutate(text, {
      onSuccess: (response) => {
        haptics.success();
        clearDraft(id);
        setResult({ response, explanation: text });
      },
    });
  };

  if (result) {
    return (
      <Screen>
        <EvaluationView data={result.response.evaluation} />
        <Button
          label={t('explain.revise')}
          icon="create-outline"
          onPress={() => {
            // Start the next attempt from the previous explanation.
            setDraft(id, result.explanation);
            setResult(null);
            setTouched(false);
            evaluate.reset();
          }}
        />
        <Button label={t('explain.finish')} variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={100} style={{ flex: 1 }}>
      <Screen>
        <Text style={typography.heading}>{t('explain.prompt', { concept: concept.data.title })}</Text>

        {lastQuestion ? (
          <View style={styles.lastQuestion}>
            <Text style={[typography.label, { color: colors.primary }]}>{t('explain.lastQuestion').toLocaleUpperCase()}</Text>
            <Text style={typography.body}>{lastQuestion}</Text>
          </View>
        ) : (
          <Card>
            {(['explain.tip1', 'explain.tip2', 'explain.tip3'] as const).map((k) => (
              <View key={k} style={styles.tip}>
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
                <Text style={[typography.caption, { flex: 1 }]}>{t(k)}</Text>
              </View>
            ))}
          </Card>
        )}

        <TextField
          value={draft}
          onChangeText={(v) => setDraft(id, v)}
          placeholder={t('explain.placeholder')}
          multiline
          maxLength={MAX_CHARS}
          editable={!evaluate.isPending}
          style={{ minHeight: 220 }}
          accessibilityLabel={t('explain.prompt', { concept: concept.data.title })}
          error={touched && tooShort ? t('explain.tooShort', { min: MIN_CHARS }) : null}
          footer={t('explain.chars', { count: draft.length, max: MAX_CHARS })}
        />

        <InlineError message={!isAiConfigured ? t('error.aiNotConfigured') : evaluate.error ? errorMessage(evaluate.error, t) : null} />

        {evaluate.isPending ? (
          <LoadingState label={t('explain.evaluating')} />
        ) : (
          <Button label={t('explain.submit')} icon="send" onPress={submit} disabled={text.length === 0 || !isAiConfigured} />
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  lastQuestion: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  tip: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
}));
