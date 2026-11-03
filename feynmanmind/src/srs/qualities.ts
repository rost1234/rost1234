import type { TranslationKey } from '@/i18n/en';
import { calculateNextReview, type QualityScore, type ReviewData } from './sm2';

export interface QualityOption {
  quality: QualityScore;
  label: TranslationKey;
  hint: TranslationKey;
  tone: 'danger' | 'warning' | 'success';
}

/** The six SM-2 grades, in the order they are shown. */
export const QUALITY_OPTIONS: readonly QualityOption[] = [
  { quality: 0, label: 'quality.0', hint: 'quality.0.hint', tone: 'danger' },
  { quality: 1, label: 'quality.1', hint: 'quality.1.hint', tone: 'danger' },
  { quality: 2, label: 'quality.2', hint: 'quality.2.hint', tone: 'danger' },
  { quality: 3, label: 'quality.3', hint: 'quality.3.hint', tone: 'warning' },
  { quality: 4, label: 'quality.4', hint: 'quality.4.hint', tone: 'success' },
  { quality: 5, label: 'quality.5', hint: 'quality.5.hint', tone: 'success' },
];

/** Days until the next review for each grade, shown on the grade buttons. */
export function previewIntervals(review: ReviewData, now: Date = new Date()): Record<QualityScore, number> {
  const out = {} as Record<QualityScore, number>;
  for (const { quality } of QUALITY_OPTIONS) {
    out[quality] = calculateNextReview(review, quality, now).interval_days;
  }
  return out;
}
