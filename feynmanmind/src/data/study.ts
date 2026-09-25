import { useMutation, useQuery } from '@tanstack/react-query';
import { generateFlashcards } from '@/api/functions';
import { addCards, cardsOf, computeStats, dueCards, reviewCard } from '@/local/logic';
import { commit, getDB, newId, useDBStore } from '@/local/store';
import { NotFoundError } from '@/local/types';
import type { QualityScore } from '@/srs/sm2';
import { keys } from './keys';
import { read } from './local';

export type { StudyStats } from '@/local/logic';

export function useStudyStats() {
  return useQuery({ queryKey: keys.stats, queryFn: () => read(() => computeStats(getDB(), new Date())) });
}

/** Due queue. Not refreshed on store changes, so the order is stable mid-session. */
export function useDueCards(conceptId?: string) {
  return useQuery({
    queryKey: keys.due(conceptId),
    queryFn: () => read(() => dueCards(getDB(), new Date(), conceptId)),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

export function useReviewCard() {
  return useMutation({
    mutationFn: ({ cardId, quality }: { cardId: string; quality: QualityScore }) =>
      read(() => useDBStore.getState().update((db) => reviewCard(db, cardId, quality, new Date()))),
  });
}

/** Asks the AI to write cards from the material, then stores the new ones locally. */
export function useGenerateFlashcards(conceptId: string) {
  return useMutation({
    mutationFn: async ({ source, maxCards }: { source: { text: string } | { pdfBase64: string }; maxCards: number }) => {
      const db = getDB();
      const concept = db.concepts[conceptId];
      const subject = concept && db.subjects[concept.subject_id];
      if (!concept || !subject) throw new NotFoundError('Concept');
      const response = await generateFlashcards({
        subject_title: subject.title,
        concept_title: concept.title,
        source,
        max_cards: maxCards,
        existing_questions: cardsOf(db, conceptId).map((c) => c.question),
      });
      const added = commit((current) => addCards(current, conceptId, response.cards, newId, new Date()));
      return { cards: added, source_truncated: response.source_truncated };
    },
  });
}
