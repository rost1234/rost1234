import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { calculateNextReview, type QualityScore, type ReviewData } from './sm2';

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
  { limit = 50, now = new Date(), conceptId }: { limit?: number; now?: Date; conceptId?: string } = {},
): Promise<DueCard[]> {
  let query = client
    .from('card_reviews')
    .select(
      'id, card_id, easiness_factor, interval_days, repetitions, next_review_date, last_reviewed_at, flashcards!inner(question, answer, concept_id)',
    )
    .lte('next_review_date', now.toISOString());
  if (conceptId) query = query.eq('flashcards.concept_id', conceptId);

  const { data, error } = await query.order('next_review_date', { ascending: true }).limit(limit);
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
 * Applies SM-2 and saves the schedule plus a review_logs entry in one
 * transaction (submit_card_review RPC). The RPC only applies if
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
  const { data, error } = await client.rpc('submit_card_review', {
    p_review_id: card.reviewId,
    p_expected_last_reviewed_at: card.review.last_reviewed_at,
    p_quality: quality,
    p_easiness_factor: next.easiness_factor,
    p_interval_days: next.interval_days,
    p_repetitions: next.repetitions,
    p_next_review_date: next.next_review_date,
  });
  if (error) throw error;
  if (data !== true) throw new ReviewConflictError();
  return next;
}
