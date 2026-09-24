/**
 * SuperMemo-2 (SM-2) spaced-repetition scheduler.
 *
 * Reference: P. A. Wozniak, "Optimization of learning" (1990), algorithm SM-2.
 *
 *   quality q ∈ {0..5}
 *     5 perfect recall · 4 correct after hesitation · 3 correct with difficulty
 *     2 wrong, but answer felt familiar · 1 wrong, remembered on seeing answer
 *     0 total blackout
 *
 *   if q >= 3 (successful recall):
 *     n = 0 → I = 1
 *     n = 1 → I = 6
 *     n > 1 → I = round(I_prev × EF)      (uses EF *before* this update)
 *     n = n + 1
 *   else (lapse):
 *     n = 0, I = 1
 *
 *   EF' = EF + (0.1 − (5 − q) × (0.08 + (5 − q) × 0.02)),  floored at 1.3
 *
 * Pure function: no I/O, no mutation, clock injectable for tests.
 */

export type QualityScore = 0 | 1 | 2 | 3 | 4 | 5;

/** Mirrors the scheduling columns of `public.card_reviews`. */
export interface ReviewData {
  easiness_factor: number;
  interval_days: number;
  repetitions: number;
  /** ISO-8601 timestamp. */
  next_review_date: string;
  /** ISO-8601 timestamp, null if the card was never reviewed. */
  last_reviewed_at: string | null;
}

export const SM2_DEFAULT_EASINESS = 2.5;
export const SM2_MIN_EASINESS = 1.3;
export const SM2_PASSING_QUALITY = 3;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Initial state for a brand-new card — same as the SQL column defaults. */
export function initialReviewData(now: Date = new Date()): ReviewData {
  return {
    easiness_factor: SM2_DEFAULT_EASINESS,
    interval_days: 0,
    repetitions: 0,
    next_review_date: now.toISOString(),
    last_reviewed_at: null,
  };
}

export function calculateNextReview(
  reviewData: ReviewData,
  qualityScore: number,
  now: Date = new Date(),
): ReviewData {
  if (!Number.isInteger(qualityScore) || qualityScore < 0 || qualityScore > 5) {
    throw new RangeError(`qualityScore must be an integer 0–5, got ${qualityScore}`);
  }
  if (Number.isNaN(now.getTime())) {
    throw new RangeError('now must be a valid Date');
  }

  // Sanitize persisted state so corrupt rows can't produce NaN/negative intervals.
  const prevEf = Number.isFinite(reviewData.easiness_factor)
    ? Math.max(SM2_MIN_EASINESS, reviewData.easiness_factor)
    : SM2_DEFAULT_EASINESS;
  const prevInterval = Math.max(0, Math.floor(reviewData.interval_days) || 0);
  const prevReps = Math.max(0, Math.floor(reviewData.repetitions) || 0);

  let repetitions: number;
  let intervalDays: number;

  if (qualityScore >= SM2_PASSING_QUALITY) {
    if (prevReps === 0) {
      intervalDays = 1;
    } else if (prevReps === 1) {
      intervalDays = 6;
    } else {
      // Guard against a 0 interval carried over from a malformed row.
      intervalDays = Math.max(1, Math.round(Math.max(1, prevInterval) * prevEf));
    }
    repetitions = prevReps + 1;
  } else {
    repetitions = 0;
    intervalDays = 1;
  }

  const penalty = 5 - qualityScore;
  const rawEf = prevEf + (0.1 - penalty * (0.08 + penalty * 0.02));
  // Round to the DB column's precision (numeric(4,2)) so client and DB agree.
  const easinessFactor = Math.max(SM2_MIN_EASINESS, Math.round(rawEf * 100) / 100);

  return {
    easiness_factor: easinessFactor,
    interval_days: intervalDays,
    repetitions,
    next_review_date: new Date(now.getTime() + intervalDays * MS_PER_DAY).toISOString(),
    last_reviewed_at: now.toISOString(),
  };
}
