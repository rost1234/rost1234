import { useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { generateFlashcards } from '@/api/functions';
import { achievements, addCards, calendarMonth, calendarWeek, cardsOf, computeStats, progressSummary, reviewCard, reviewQueue, type QueueOptions } from '@/local/logic';
import { commit, getDB, newId, useDBStore } from '@/local/store';
import { NotFoundError } from '@/local/types';
import type { QualityScore } from '@/srs/sm2';
import { usePrefsStore } from '@/state/prefsStore';
import { keys, type ReviewFilter } from './keys';
import { read } from './local';

export type { CalendarDay, StudyStats } from '@/local/logic';

/** One month of review history and upcoming due cards (month is 0-based). */
export function useCalendarMonth(year: number, month: number) {
  return useQuery({ queryKey: ['calendar', year, month], queryFn: () => read(() => calendarMonth(getDB(), year, month, new Date())) });
}

export function useStudyStats() {
  return useQuery({ queryKey: keys.stats, queryFn: () => read(() => computeStats(getDB(), new Date())) });
}

/**
 * Queue options from the review settings. Reviewing one concept on purpose
 * ignores the daily limits; the general queue respects them.
 */
export function queueOptions(filter: ReviewFilter): QueueOptions {
  const p = usePrefsStore.getState();
  const limited = !filter.conceptId;
  return {
    ...filter,
    newPerDay: limited ? p.newCardsPerDay : Number.MAX_SAFE_INTEGER,
    maxPerDay: limited ? p.maxReviewsPerDay : Number.MAX_SAFE_INTEGER,
    order: p.reviewOrder,
  };
}

/** Review queue. Not refreshed on store changes, so the order is stable mid-session. */
export function useDueCards(filter: ReviewFilter = {}) {
  return useQuery({
    queryKey: keys.due(filter),
    queryFn: () => read(() => reviewQueue(getDB(), new Date(), queueOptions(filter))),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

/** How many cards today's general queue holds (follows the store and the review settings). */
export function useQueueCount(): number {
  const db = useDBStore((s) => s.db);
  const newPerDay = usePrefsStore((s) => s.newCardsPerDay);
  const maxPerDay = usePrefsStore((s) => s.maxReviewsPerDay);
  const order = usePrefsStore((s) => s.reviewOrder);
  return reviewQueue(db, new Date(), { newPerDay, maxPerDay, order }).length;
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

/** This week's days, Sunday to Saturday (follows the store). */
export function useWeek() {
  const db = useDBStore((s) => s.db);
  return useMemo(() => calendarWeek(db, new Date()), [db]);
}

/** Totals for the Me tab: week minutes, accuracy, streaks, achievements. */
export function useProgress() {
  const db = useDBStore((s) => s.db);
  return useMemo(() => {
    const now = new Date();
    return { summary: progressSummary(db, now), achievements: achievements(db, now) };
  }, [db]);
}
