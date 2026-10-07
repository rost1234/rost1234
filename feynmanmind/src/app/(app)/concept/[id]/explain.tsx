import { useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ChoiceChips } from '@/components/ChoiceChips';
import { Button, Card, ErrorState, IconButton, InlineError, LoadingState } from '@/components/ui';
import { useConcept } from '@/data/concepts';
import { conceptLesson, resetTutorChat, useClarifyTutorQuestion, useSendToTutor, useTutorChat, type TutorMessageKind } from '@/data/tutor';
import { ChatBubble, PendingBubble } from '@/features/tutor/ChatBubbles';
import { LessonPeekButton } from '@/features/tutor/LessonPeek';
import { useT } from '@/i18n';
import { confirmAsync } from '@/lib/dialogs';
import { useAiConfigured } from '@/lib/env';
import { errorMessage } from '@/lib/errors';
import { haptics } from '@/lib/haptics';
import { KeyboardInsetView, useKeyboardVisible } from '@/lib/keyboard';
import { lastFeedback, latestExplanation } from '@/local/logic';
import { useDBStore } from '@/local/store';
import { useDraftsStore } from '@/state/draftsStore';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

// Must match the feynman-evaluate Edge Function limits.
const MIN_CHARS = 20;
const MAX_CHARS = 8000;

/**
 * Explaining a concept is a conversation with the tutor: you write an
 * explanation, the tutor answers with a score, feedback and one question, and
 * says what it expects next — a short answer to its question (the box below is
 * empty for it), or a rewrite of part of your explanation (which opens again
 * for editing, with the sentence to fix shown on top). "I didn't understand the
 * question" gets an explanation of the question, never its answer. The topic or
 * the instruction stays pinned at the top and the send bar sits on the keyboard.
 */
export default function ExplainScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const styles = useStyles();
  const { colors } = useTheme();
  const concept = useConcept(id);
  const chat = useTutorChat(id);
  const db = useDBStore((s) => s.db);
  const lesson = useMemo(() => conceptLesson(db, id), [db, id]);
  const [editing, setEditing] = useState(false);

  if (concept.isPending) return <LoadingState />;
  if (concept.isError) return <ErrorState message={errorMessage(concept.error, t)} onRetry={() => void concept.refetch()} />;

  const last = lastFeedback(chat);
  const writing = chat.length === 0 || editing;
  const peek = lesson ? { title: concept.data.title, text: lesson.text, keyPoints: lesson.keyPoints } : null;

  const startOver = async () => {
    const ok = await confirmAsync({
      title: t('tutor.startOverTitle'),
      message: t('tutor.startOverBody'),
      confirmLabel: t('tutor.startOver'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    resetTutorChat(id);
    useDraftsStore.getState().clearDraft(`${id}#revision`);
    useDraftsStore.getState().clearDraft(`${id}#answer`);
    setEditing(false);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: chat.length ? () => <IconButton icon="refresh" label={t('tutor.startOver')} onPress={() => void startOver()} color={colors.primary} /> : undefined,
        }}
      />
      <KeyboardInsetView style={{ backgroundColor: colors.background }}>
        {editing && last?.evaluation ? (
          <View style={[styles.pin, styles.pinRefine]}>
            <Text style={styles.pinTitle}>🎯 {last.text || t('tutor.tag.refine')}</Text>
            {last.evaluation.refine_quote ? (
              <Text style={styles.pinSub} numberOfLines={2}>
                {t('tutor.fixThis')} “{last.evaluation.refine_quote}”
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.pin}>
            <Text style={[styles.pinTitle, { flex: 1 }]} numberOfLines={1}>
              💡 {concept.data.title}
            </Text>
            <LessonPeekButton lesson={peek} />
          </View>
        )}
        {writing ? (
          <Writer
            conceptId={id}
            conceptTitle={concept.data.title}
            kind={editing ? 'revision' : 'explanation'}
            initial={editing ? latestExplanation(chat) : ''}
            lesson={peek}
            onCancel={editing ? () => setEditing(false) : undefined}
            onSent={() => setEditing(false)}
          />
        ) : (
          <Conversation conceptId={id} onEdit={() => setEditing(true)} />
        )}
      </KeyboardInsetView>
    </>
  );
}

/** The explanation editor: grows into the free space, scrolls inside itself, send bar on the keyboard. */
function Writer({
  conceptId,
  conceptTitle,
  kind,
  initial,
  lesson,
  onCancel,
  onSent,
}: {
  conceptId: string;
  conceptTitle: string;
  kind: TutorMessageKind;
  initial: string;
  lesson: Parameters<typeof LessonPeekButton>[0]['lesson'];
  onCancel?: () => void;
  onSent: () => void;
}) {
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const aiReady = useAiConfigured();
  const keyboard = useKeyboardVisible();
  const send = useSendToTutor(conceptId);
  const draftKey = kind === 'revision' ? `${conceptId}#revision` : conceptId;
  const stored = useDraftsStore((s) => s.drafts[draftKey]);
  const setDraft = useDraftsStore((s) => s.setDraft);
  const clearDraft = useDraftsStore((s) => s.clearDraft);
  const draft = stored ?? initial;
  const [touched, setTouched] = useState(false);
  const text = draft.trim();
  const tooShort = text.length < MIN_CHARS;

  const submit = () => {
    setTouched(true);
    if (tooShort || send.isPending) return;
    Keyboard.dismiss();
    send.mutate(
      { text, kind },
      {
        onSuccess: () => {
          haptics.success();
          clearDraft(draftKey);
          onSent();
        },
      },
    );
  };

  return (
    <>
      <View style={styles.writer}>
        {!keyboard && kind === 'explanation' ? (
          <>
            <Text style={typography.subheading}>{t('explain.prompt', { concept: conceptTitle })}</Text>
            <Card style={{ gap: spacing.xs }}>
              {(['explain.tip1', 'explain.tip2', 'explain.tip3'] as const).map((k) => (
                <View key={k} style={styles.tip}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
                  <Text style={[typography.caption, { flex: 1 }]}>{t(k)}</Text>
                </View>
              ))}
            </Card>
          </>
        ) : null}
        <TextInput
          value={draft}
          onChangeText={(v) => setDraft(draftKey, v)}
          placeholder={t('explain.placeholder')}
          placeholderTextColor={colors.textMuted}
          multiline
          scrollEnabled
          maxLength={MAX_CHARS}
          editable={!send.isPending}
          textAlignVertical="top"
          accessibilityLabel={t('explain.prompt', { concept: conceptTitle })}
          style={[styles.editor, { textAlign: t.isRTL ? 'right' : 'left' }, touched && tooShort && { borderColor: colors.danger }]}
        />
        <View style={styles.row}>
          <Text style={[typography.caption, { flex: 1, color: touched && tooShort ? colors.danger : colors.textMuted }]}>
            {touched && tooShort ? t('explain.tooShort', { min: MIN_CHARS }) : t('explain.chars', { count: draft.length, max: MAX_CHARS })}
          </Text>
        </View>
        {send.isPending ? <LoadingState label={t('explain.evaluating')} /> : null}
        <InlineError message={!aiReady ? t('error.aiNotConfigured') : send.error ? errorMessage(send.error, t) : null} />
      </View>
      <View style={styles.toolbar}>
        <LessonPeekButton lesson={lesson} />
        {onCancel ? (
          <Pressable accessibilityRole="button" onPress={onCancel} style={styles.toolChip} hitSlop={6}>
            <Text style={styles.toolChipText}>{t('tutor.backToChat')}</Text>
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }} />
        {keyboard ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t('tutor.hideKeyboard')} onPress={() => Keyboard.dismiss()} style={styles.toolIcon} hitSlop={6}>
            <Ionicons name="chevron-down" size={20} color={colors.primary} />
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !text || !aiReady || send.isPending }}
          disabled={!text || !aiReady || send.isPending}
          onPress={submit}
          style={({ pressed }) => [styles.sendPill, (!text || !aiReady || send.isPending) && { opacity: 0.5 }, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.sendText}>{kind === 'revision' ? t('tutor.sendRevision') : t('explain.submit')}</Text>
          <Ionicons name="send" size={16} color={colors.onPrimary} style={t.isRTL ? { transform: [{ scaleX: -1 }] } : undefined} />
        </Pressable>
      </View>
    </>
  );
}

type Chip = 'clarify' | 'edit' | 'finish' | 'new';

/** The messages, then what you can do next: answer, edit, ask what the question means, or finish. */
function Conversation({ conceptId, onEdit }: { conceptId: string; onEdit: () => void }) {
  const t = useT();
  const styles = useStyles();
  const { colors } = useTheme();
  const aiReady = useAiConfigured();
  const chat = useTutorChat(conceptId);
  const send = useSendToTutor(conceptId);
  const clarify = useClarifyTutorQuestion(conceptId);
  const answer = useDraftsStore((s) => s.drafts[`${conceptId}#answer`] ?? '');
  const setDraft = useDraftsStore((s) => s.setDraft);
  const clearDraft = useDraftsStore((s) => s.clearDraft);
  const scroll = useRef<ScrollView>(null);
  const last = lastFeedback(chat);
  const step = last?.evaluation?.next_step ?? 'answer_question';
  const question = last?.evaluation?.question ?? null;
  const busy = send.isPending || clarify.isPending;

  const sendAnswer = () => {
    const text = answer.trim();
    if (text.length < 2 || busy) return;
    send.mutate(
      { text, kind: 'answer' },
      {
        onSuccess: () => {
          haptics.success();
          clearDraft(`${conceptId}#answer`);
        },
      },
    );
  };

  const onChip = (chip: Chip) => {
    if (chip === 'edit') return onEdit();
    if (chip === 'finish') return router.back();
    if (chip === 'clarify' && question) clarify.mutate({ question: t('tutor.didntUnderstand'), tutorQuestion: question });
  };

  const chips: { value: Chip; label: string }[] = [
    ...(question && step !== 'done' ? [{ value: 'clarify' as const, label: `🤔 ${t('tutor.didntUnderstand')}` }] : []),
    ...(step === 'answer_question' ? [{ value: 'edit' as const, label: `✏️ ${t('tutor.editExplanation')}` }] : []),
    { value: 'finish', label: step === 'done' ? `✓ ${t('tutor.finishDone')}` : t('tutor.finish') },
  ];

  return (
    <>
      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        contentContainerStyle={styles.chat}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
      >
        {chat.map((turn) => (
          <ChatBubble key={turn.id} turn={turn} latest={turn === last} />
        ))}
        {send.isPending ? <PendingBubble text={send.variables.text} /> : null}
        {clarify.isPending ? <PendingBubble text={clarify.variables.question} /> : null}
        <InlineError message={!aiReady ? t('error.aiNotConfigured') : send.error ? errorMessage(send.error, t) : clarify.error ? errorMessage(clarify.error, t) : null} />
      </ScrollView>

      <View style={styles.composer}>
        {!busy ? <ChoiceChips<Chip> options={chips} onChange={onChip} /> : null}
        {step === 'refine_explanation' ? (
          <Button label={t('tutor.editExplanation')} icon="create-outline" onPress={onEdit} disabled={busy} />
        ) : (
          <View style={styles.inputRow}>
            <TextInput
              value={answer}
              onChangeText={(v) => setDraft(`${conceptId}#answer`, v)}
              placeholder={step === 'done' ? t('tutor.answerOptional') : t('tutor.answerPlaceholder')}
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={2000}
              editable={!busy}
              accessibilityLabel={t('tutor.answerPlaceholder')}
              style={[styles.answer, { textAlign: t.isRTL ? 'right' : 'left' }]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('tutor.send')}
              disabled={answer.trim().length < 2 || busy || !aiReady}
              onPress={sendAnswer}
              style={[styles.sendRound, (answer.trim().length < 2 || busy || !aiReady) && { opacity: 0.4 }]}
            >
              <Ionicons name="send" size={18} color={colors.onPrimary} style={t.isRTL ? { transform: [{ scaleX: -1 }] } : undefined} />
            </Pressable>
          </View>
        )}
      </View>
    </>
  );
}

const useStyles = makeStyles(({ colors, textScale }) => ({
  pin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 52,
  },
  pinRefine: { flexDirection: 'column', alignItems: 'stretch', gap: 2, backgroundColor: colors.accentSoft },
  pinTitle: { color: colors.text, fontWeight: '800', fontSize: Math.round(15 * textScale) },
  pinSub: { color: colors.textMuted, fontSize: Math.round(13 * textScale) },
  writer: { flex: 1, padding: spacing.lg, gap: spacing.md },
  tip: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  editor: {
    flex: 1,
    minHeight: 120,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.md,
    color: colors.text,
    fontSize: Math.round(16 * textScale),
    lineHeight: Math.round(25 * textScale),
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  toolChip: { borderRadius: radius.pill, paddingHorizontal: spacing.md, minHeight: 36, justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  toolChipText: { color: colors.text, fontWeight: '700', fontSize: Math.round(14 * textScale) },
  toolIcon: { width: 40, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  sendPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: spacing.lg, minHeight: 40 },
  sendText: { color: colors.onPrimary, fontWeight: '800', fontSize: Math.round(15 * textScale) },
  chat: { padding: spacing.lg, gap: spacing.md },
  composer: { gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  answer: {
    flex: 1,
    maxHeight: 130,
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.text,
    fontSize: Math.round(16 * textScale),
    backgroundColor: colors.background,
  },
  sendRound: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
}));
