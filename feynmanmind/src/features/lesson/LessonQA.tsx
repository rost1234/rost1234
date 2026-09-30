import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, InlineError, SectionHeader, TextField } from '@/components/ui';
import { clearThread, useAskQuestion, useQuestionThread, type AskContext } from '@/data/questions';
import { useT } from '@/i18n';
import { confirmAsync } from '@/lib/dialogs';
import { useAiConfigured } from '@/lib/env';
import { errorMessage } from '@/lib/errors';
import { haptics } from '@/lib/haptics';
import type { QaTurn } from '@/local/types';
import { makeStyles, radius, spacing, useTheme } from '@/theme';
import { CopyButton, paragraphsOf } from './LessonCard';

const STARTERS = ['lesson.ask.example', 'lesson.ask.why', 'lesson.ask.simpler'] as const;

/**
 * "Didn't get something? Ask." — questions about the lesson, answered by the
 * AI at the lesson's level. The conversation is saved on the device.
 */
export function LessonQA({ context }: { context: AskContext }) {
  const t = useT();
  const styles = useStyles();
  const { typography } = useTheme();
  const aiReady = useAiConfigured();
  const thread = useQuestionThread(context.threadKey);
  const ask = useAskQuestion();
  const [draft, setDraft] = useState('');

  const send = (text: string) => {
    const question = text.trim();
    if (question.length < 2 || ask.isPending) return;
    ask.mutate(
      { context, question },
      {
        onSuccess: () => {
          haptics.success();
          setDraft('');
        },
      },
    );
  };

  const clear = async () => {
    const ok = await confirmAsync({
      title: t('lesson.ask.clearTitle'),
      message: t('lesson.ask.clearBody'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (ok) clearThread(context.threadKey);
  };

  const last = thread[thread.length - 1];
  const suggestions = last ? last.follow_ups : STARTERS.map((k) => t(k));

  return (
    <View style={{ gap: spacing.md }}>
      <SectionHeader
        title={t('lesson.ask.title')}
        action={thread.length ? <Button label={t('lesson.ask.clear')} variant="ghost" onPress={() => void clear()} /> : undefined}
      />
      {thread.length === 0 ? <Text style={typography.caption}>{t('lesson.ask.intro')}</Text> : null}

      {thread.map((turn) => (
        <Turn key={turn.id} turn={turn} />
      ))}

      {ask.isPending ? (
        <View style={styles.pending}>
          <Text style={[typography.body, styles.questionText]}>{ask.variables?.question}</Text>
          <Text style={typography.caption}>{t('lesson.ask.thinking')}</Text>
        </View>
      ) : null}

      {aiReady && !ask.isPending && suggestions.length ? (
        <View style={styles.chips}>
          {suggestions.map((s) => (
            <Pressable key={s} accessibilityRole="button" onPress={() => send(s)} style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}>
              <Text style={styles.chipText}>{s}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <TextField
        value={draft}
        onChangeText={setDraft}
        placeholder={t('lesson.ask.placeholder')}
        accessibilityLabel={t('lesson.ask.title')}
        multiline
        maxLength={500}
        editable={aiReady && !ask.isPending}
      />
      <InlineError message={!aiReady ? t('error.aiNotConfigured') : ask.error ? errorMessage(ask.error, t) : null} />
      <Button
        label={t('lesson.ask.send')}
        icon="send"
        onPress={() => send(draft)}
        disabled={!aiReady || draft.trim().length < 2}
        loading={ask.isPending}
      />
    </View>
  );
}

function Turn({ turn }: { turn: QaTurn }) {
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.question}>
        <Ionicons name="help-circle" size={18} color={colors.primary} />
        <Text style={[typography.body, styles.questionText]} selectable>
          {turn.question}
        </Text>
      </View>
      <View style={styles.answer}>
        {paragraphsOf(turn.answer).map((p, i) => (
          <Text key={i} style={styles.answerText} selectable>
            {p}
          </Text>
        ))}
        <View style={styles.answerFooter}>
          <CopyButton onCopy={() => Clipboard.setStringAsync(`${turn.question}\n\n${turn.answer}`)} label={t('lesson.ask.copyAnswer')} />
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colors, textScale }) => ({
  question: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    alignSelf: 'flex-start',
    maxWidth: '92%',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  questionText: { flexShrink: 1, fontWeight: '600' },
  answer: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  answerText: { color: colors.text, fontSize: Math.round(16 * textScale), lineHeight: Math.round(26 * textScale) },
  answerFooter: { flexDirection: 'row', justifyContent: 'flex-end' },
  pending: {
    gap: spacing.xs,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    padding: spacing.md,
    opacity: 0.8,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  chipText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
}));
