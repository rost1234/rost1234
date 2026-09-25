import type { FeynmanEvaluation } from '@/api/functions';
import type { Course } from '@/content/types';
import type { ReviewData } from '@/srs/sm2';

/** Everything the app stores, kept on the device. Records are keyed by id. */
export interface LocalDB {
  subjects: Record<string, Subject>;
  concepts: Record<string, Concept>;
  cards: Record<string, Flashcard>;
  sessions: Record<string, FeynmanSession>;
  /** Per local day (YYYY-MM-DD): reviews done and how many were recalled (grade ≥ 3). */
  reviewDays: Record<string, { reviewed: number; correct: number }>;
  /** Courses the AI generated for this learner (built-in ones ship with the app). */
  courses: Record<string, Course>;
}

export interface Subject {
  id: string;
  title: string;
  created_at: string;
  /** Set when the subject was created from a guided course. */
  course_id?: string;
}

export interface Concept {
  id: string;
  subject_id: string;
  title: string;
  /** 0–100, the latest explanation score. */
  mastery_level: number;
  created_at: string;
  /** The course station this concept was started from (see CourseConcept.key). */
  course_key?: string;
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

export const emptyDB = (): LocalDB => ({ subjects: {}, concepts: {}, cards: {}, sessions: {}, reviewDays: {}, courses: {} });

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
