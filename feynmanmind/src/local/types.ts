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
  /** AI-written lessons for course stations that don't ship with one, keyed `${courseId}/${stationKey}`. */
  lessons: Record<string, Lesson>;
  /** Placement test results per course. */
  placements: Record<string, Placement>;
}

export interface Lesson {
  explanation: string;
  cards: { question: string; answer: string }[];
}

export interface Placement {
  /** Index of the level the learner was placed in; every level below it counts as known. */
  levelIndex: number;
  /** Correct answers per level that was tested, in order. */
  scores: number[];
  taken_at: string;
}

export interface Subject {
  id: string;
  title: string;
  created_at: string;
  /** Set when the subject was created from a guided course. */
  course_id?: string;
  /** The catch-all subject for standalone concepts added without a subject. */
  loose?: boolean;
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
  /** A lesson written for this concept (standalone concepts), shown on its page. */
  lesson?: string;
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

export const emptyDB = (): LocalDB => ({
  subjects: {},
  concepts: {},
  cards: {},
  sessions: {},
  reviewDays: {},
  courses: {},
  lessons: {},
  placements: {},
});

export class DuplicateError extends Error {
  readonly code = 'duplicate';
  constructor() {
    super('An item with this name already exists');
    this.name = 'DuplicateError';
  }
}

/** A course station has no lesson yet: it has to be written (by the AI) before it can be started. */
export class LessonMissingError extends Error {
  readonly code = 'lesson_missing';
  constructor() {
    super('This station has no lesson yet');
    this.name = 'LessonMissingError';
  }
}

export class NotFoundError extends Error {
  readonly code = 'not_found';
  constructor(what: string) {
    super(`${what} not found`);
    this.name = 'NotFoundError';
  }
}
