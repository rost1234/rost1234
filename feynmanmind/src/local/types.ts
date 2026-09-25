import type { FeynmanEvaluation } from '@/api/functions';
import type { ReviewData } from '@/srs/sm2';

/** Everything the app stores, kept on the device. Records are keyed by id. */
export interface LocalDB {
  subjects: Record<string, Subject>;
  concepts: Record<string, Concept>;
  cards: Record<string, Flashcard>;
  sessions: Record<string, FeynmanSession>;
  /** Per local day (YYYY-MM-DD): reviews done and how many were recalled (grade ≥ 3). */
  reviewDays: Record<string, { reviewed: number; correct: number }>;
}

export interface Subject {
  id: string;
  title: string;
  created_at: string;
}

export interface Concept {
  id: string;
  subject_id: string;
  title: string;
  /** 0–100, the latest explanation score. */
  mastery_level: number;
  created_at: string;
}

export interface Flashcard {
  id: string;
  concept_id: string;
  question: string;
  answer: string;
  created_at: string;
  /** SM-2 scheduling state. */
  review: ReviewData;
}

export interface FeynmanSession {
  id: string;
  concept_id: string;
  user_explanation: string;
  comprehension_score: number;
  socratic_question: string | null;
  jargon_detected: FeynmanEvaluation['jargon_detected'];
  misconceptions: FeynmanEvaluation['misconceptions'];
  created_at: string;
}

export const emptyDB = (): LocalDB => ({ subjects: {}, concepts: {}, cards: {}, sessions: {}, reviewDays: {} });

export class DuplicateError extends Error {
  readonly code = 'duplicate';
  constructor() {
    super('An item with this name already exists');
    this.name = 'DuplicateError';
  }
}

export class NotFoundError extends Error {
  readonly code = 'not_found';
  constructor(what: string) {
    super(`${what} not found`);
    this.name = 'NotFoundError';
  }
}
