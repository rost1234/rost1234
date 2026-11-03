import { useMutation, useQuery } from '@tanstack/react-query';
import { addCards, cardsOf, deleteCard, updateCard } from '@/local/logic';
import { commit, getDB, newId, useDBStore } from '@/local/store';
import { DuplicateError, NotFoundError } from '@/local/types';
import { keys } from './keys';
import { read } from './local';

export interface CardRow {
  id: string;
  question: string;
  answer: string;
  next_review_date: string | null;
}

export function useFlashcards(conceptId: string) {
  return useQuery({
    queryKey: keys.cards(conceptId),
    queryFn: () =>
      read((): CardRow[] =>
        cardsOf(getDB(), conceptId).map((c) => ({ id: c.id, question: c.question, answer: c.answer, next_review_date: c.review.next_review_date })),
      ),
  });
}

export function useFlashcard(id: string | undefined) {
  return useQuery({
    queryKey: keys.card(id ?? 'new'),
    enabled: !!id,
    queryFn: () =>
      read(() => {
        const c = getDB().cards[id!];
        if (!c) throw new NotFoundError('Flashcard');
        return c;
      }),
  });
}

export function useSaveFlashcard() {
  return useMutation({
    mutationFn: (card: { id?: string; conceptId: string; question: string; answer: string }) =>
      read(() => {
        if (card.id) {
          useDBStore.getState().update((db) => updateCard(db, card.id!, card));
          return;
        }
        const added = commit((db) => addCards(db, card.conceptId, [card], newId, new Date()));
        if (added.length === 0) throw new DuplicateError();
      }),
  });
}

export function useDeleteFlashcard() {
  return useMutation({
    mutationFn: (id: string) => read(() => useDBStore.getState().update((db) => deleteCard(db, id))),
  });
}
