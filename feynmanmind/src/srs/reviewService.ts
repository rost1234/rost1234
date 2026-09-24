import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.ts';
import { calculateNextReview, type QualityScore, type ReviewData } from './sm2.ts';

type Client = SupabaseClient<Database>;

export interface DueCard {
  reviewId: string;
  cardId: string;
  conceptId: string;
  question: string;
  answer: string;
  review: ReviewData;
}

/** Another device reviewed this card first; refetch the queue and move on. */
export class ReviewConflictError extends Error {
  constructor() {
    super('This card was already reviewed on another device');
    this.name = 'ReviewConflictError';
  }
}

/** Cards due now, most overdue first. RLS scopes this to the signed-in user. */
export async function fetchDueCards(
  client: Client,
  { limit = 20, now = new Date() }: { limit?: number; now?: Date } = {},
): Promise<DueCard[]> {
  const { data, error } = await client
    .from('card_reviews')
    .select(
      'id, card_id, easiness_factor, interval_days, repetitions, next_review_date, last_reviewed_at, flashcards!inner(question, answer, concept_id)',
    )
    .lte('next_review_date', now.toISOString())
    .order('next_review_date', { ascending: true })
    .limit(limit);
  if (error) throw error;

  return (data ?? []).map((row) => ({
    reviewId: row.id,
    cardId: row.card_id,
    conceptId: row.flashcards.concept_id,
    question: row.flashcards.question,
    answer: row.flashcards.answer,
    review: {
      easiness_factor: Number(row.easiness_factor),
      interval_days: row.interval_days,
      repetitions: row.repetitions,
      next_review_date: row.next_review_date,
      last_reviewed_at: row.last_reviewed_at,
    },
  }));
}

/**
 * Applies SM-2 and saves the new schedule. The update only matches if
 * last_reviewed_at is unchanged since the card was fetched, so two devices
 * grading the same card can't both advance it.
 */
export async function submitReview(
  client: Client,
  card: Pick<DueCard, 'reviewId' | 'review'>,
  quality: QualityScore,
  now: Date = new Date(),
): Promise<ReviewData> {
  const next = calculateNextReview(card.review, quality, now);

  let query = client
    .from('card_reviews')
    .update({
      easiness_factor: next.easiness_factor,
      interval_days: next.interval_days,
      repetitions: next.repetitions,
      next_review_date: next.next_review_date,
      last_reviewed_at: next.last_reviewed_at,
    })
    .eq('id', card.reviewId);
  query =
    card.review.last_reviewed_at === null
      ? query.is('last_reviewed_at', null)
      : query.eq('last_reviewed_at', card.review.last_reviewed_at);

  const { data, error } = await query.select('id').maybeSingle();
  if (error) throw error;
  if (!data) throw new ReviewConflictError();
  return next;
}
