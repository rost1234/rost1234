import type { QualityScore } from './sm2';

export interface SessionSummary {
  reviewed: number;
  recalled: number;
  /** 0–100, or null when nothing was reviewed. */
  recallPct: number | null;
}

/** Summary shown at the end of a review session. Grades ≥ 3 count as recalled (SM-2). */
export function summarizeSession(grades: readonly QualityScore[]): SessionSummary {
  const recalled = grades.filter((q) => q >= 3).length;
  return {
    reviewed: grades.length,
    recalled,
    recallPct: grades.length ? Math.round((recalled / grades.length) * 100) : null,
  };
}
