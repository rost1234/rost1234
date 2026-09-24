import { useState } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Button, ErrorState, InlineError, LoadingState, Screen, TextField } from '@/components/ui';
import { useFlashcard, useSaveFlashcard } from '@/data/flashcards';
import { useT } from '@/i18n';
import { errorMessage } from '@/lib/errors';

/** Create (`/card/new?conceptId=…`) or edit (`/card/<id>`) a flashcard. */
export default function CardEditor() {
  const { id, conceptId } = useLocalSearchParams<{ id: string; conceptId?: string }>();
  const isNew = id === 'new';
  const t = useT();
  const card = useFlashcard(isNew ? undefined : id);

  if (!isNew && card.isPending) return <LoadingState />;
  if (!isNew && card.isError) return <ErrorState message={errorMessage(card.error, t)} onRetry={() => void card.refetch()} />;

  return (
    <CardForm
      key={card.data?.id ?? 'new'}
      id={isNew ? undefined : id}
      conceptId={isNew ? conceptId : card.data?.concept_id}
      initialQuestion={card.data?.question ?? ''}
      initialAnswer={card.data?.answer ?? ''}
    />
  );
}

function CardForm({ id, conceptId, initialQuestion, initialAnswer }: {
  id?: string;
  conceptId?: string;
  initialQuestion: string;
  initialAnswer: string;
}) {
  const t = useT();
  const isNew = !id;
  const save = useSaveFlashcard();
  const [question, setQuestion] = useState(initialQuestion);
  const [answer, setAnswer] = useState(initialAnswer);
  const targetConcept = conceptId;
  const valid = question.trim().length > 0 && answer.trim().length > 0 && !!targetConcept;

  return (
    <>
      <Stack.Screen options={{ title: isNew ? t('nav.newCard') : t('nav.editCard') }} />
      <Screen>
        <TextField
          label={t('card.question')}
          value={question}
          onChangeText={setQuestion}
          placeholder={t('card.questionPlaceholder')}
          multiline
          maxLength={1000}
          style={{ minHeight: 100 }}
          autoFocus={isNew}
        />
        <TextField
          label={t('card.answer')}
          value={answer}
          onChangeText={setAnswer}
          placeholder={t('card.answerPlaceholder')}
          multiline
          maxLength={2000}
          style={{ minHeight: 120 }}
        />
        <InlineError message={save.error ? errorMessage(save.error, t) : null} />
        <Button
          label={t('common.save')}
          onPress={() =>
            save.mutate(
              { id, conceptId: targetConcept!, question, answer },
              { onSuccess: () => router.back() },
            )
          }
          disabled={!valid}
          loading={save.isPending}
        />
      </Screen>
    </>
  );
}
