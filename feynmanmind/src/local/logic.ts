/**
 * Pure operations on the local database. Each mutation returns a new LocalDB
 * (the input is never modified), which keeps the store simple and testable.
 */
import { calculateNextReview, initialReviewData, type QualityScore } from '@/srs/sm2';
import type { FeynmanEvaluation } from '@/api/functions';
import { findStation, stationsOf, type Course, type CourseConcept, type LevelKey } from '@/content/types';
import { DuplicateError, LessonMissingError, NotFoundError, type Concept, type Flashcard, type Lesson, type LocalDB, type Placement } from './types';

type NewId = () => string;

/**
 * Key for spotting the same question with different case, spacing or
 * punctuation. Deliberately avoids \p{…} regex classes so it runs on Hermes.
 */
export const questionKey = (q: string) =>
  q.toLocaleLowerCase().replace(/[\s.,;:!?¿¡'"`´“”‘’«»()[\]{}<>\-–—_/\\|*#%&+=~^@$]+/g, '');

const titleKey = (s: string) => s.trim().toLocaleLowerCase();

function assertUniqueTitle(titles: Iterable<{ id: string; title: string }>, title: string, exceptId?: string) {
  const key = titleKey(title);
  for (const t of titles) if (t.id !== exceptId && titleKey(t.title) === key) throw new DuplicateError();
}

function omit<T>(record: Record<string, T>, drop: (value: T) => boolean): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([, v]) => !drop(v)));
}

// ---------------------------------------------------------------------------
// Subjects & concepts
// ---------------------------------------------------------------------------

export function saveSubject(db: LocalDB, input: { id?: string; title: string }, newId: NewId, now: Date): [LocalDB, string] {
  const title = input.title.trim();
  assertUniqueTitle(Object.values(db.subjects), title, input.id);
  if (input.id) {
    const existing = db.subjects[input.id];
    if (!existing) throw new NotFoundError('Subject');
    return [{ ...db, subjects: { ...db.subjects, [input.id]: { ...existing, title } } }, input.id];
  }
  const id = newId();
  return [{ ...db, subjects: { ...db.subjects, [id]: { id, title, created_at: now.toISOString() } } }, id];
}

export function deleteSubject(db: LocalDB, id: string): LocalDB {
  const conceptIds = new Set(Object.values(db.concepts).filter((c) => c.subject_id === id).map((c) => c.id));
  return {
    ...db,
    subjects: omit(db.subjects, (s) => s.id === id),
    concepts: omit(db.concepts, (c) => conceptIds.has(c.id)),
    cards: omit(db.cards, (c) => conceptIds.has(c.concept_id)),
    sessions: omit(db.sessions, (s) => conceptIds.has(s.concept_id)),
  };
}

export function saveConcept(
  db: LocalDB,
  input: { id?: string; subjectId: string; title: string },
  newId: NewId,
  now: Date,
): [LocalDB, string] {
  const title = input.title.trim();
  const subjectId = input.id ? db.concepts[input.id]?.subject_id : input.subjectId;
  if (!subjectId || !db.subjects[subjectId]) throw new NotFoundError('Subject');
  assertUniqueTitle(Object.values(db.concepts).filter((c) => c.subject_id === subjectId), title, input.id);
  if (input.id) {
    const existing = db.concepts[input.id]!;
    return [{ ...db, concepts: { ...db.concepts, [input.id]: { ...existing, title } } }, input.id];
  }
  const id = newId();
  const concept: Concept = { id, subject_id: subjectId, title, mastery_level: 0, created_at: now.toISOString() };
  return [{ ...db, concepts: { ...db.concepts, [id]: concept } }, id];
}

export function deleteConcept(db: LocalDB, id: string): LocalDB {
  return {
    ...db,
    concepts: omit(db.concepts, (c) => c.id === id),
    cards: omit(db.cards, (c) => c.concept_id === id),
    sessions: omit(db.sessions, (s) => s.concept_id === id),
  };
}

// ---------------------------------------------------------------------------
// Flashcards
// ---------------------------------------------------------------------------

export const cardsOf = (db: LocalDB, conceptId: string) =>
  Object.values(db.cards)
    .filter((c) => c.concept_id === conceptId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

/** Adds cards, skipping any whose question already exists for the concept. Returns the added ones. */
export function addCards(
  db: LocalDB,
  conceptId: string,
  cards: { question: string; answer: string }[],
  newId: NewId,
  now: Date,
): [LocalDB, Flashcard[]] {
  if (!db.concepts[conceptId]) throw new NotFoundError('Concept');
  const seen = new Set(cardsOf(db, conceptId).map((c) => questionKey(c.question)));
  const added: Flashcard[] = [];
  cards.forEach((c, i) => {
    const question = c.question.trim();
    const answer = c.answer.trim();
    const key = questionKey(question);
    if (!key || !answer || seen.has(key)) return;
    seen.add(key);
    // Stagger timestamps so insertion order is stable when sorting.
    const created = new Date(now.getTime() + i).toISOString();
    added.push({ id: newId(), concept_id: conceptId, question, answer, created_at: created, review: initialReviewData(now) });
  });
  const next = { ...db.cards };
  for (const c of added) next[c.id] = c;
  return [{ ...db, cards: next }, added];
}

export function updateCard(db: LocalDB, id: string, values: { question: string; answer: string }): LocalDB {
  const card = db.cards[id];
  if (!card) throw new NotFoundError('Flashcard');
  const question = values.question.trim();
  const key = questionKey(question);
  if (cardsOf(db, card.concept_id).some((c) => c.id !== id && questionKey(c.question) === key)) throw new DuplicateError();
  return { ...db, cards: { ...db.cards, [id]: { ...card, question, answer: values.answer.trim() } } };
}

export function deleteCard(db: LocalDB, id: string): LocalDB {
  return { ...db, cards: omit(db.cards, (c) => c.id === id) };
}

// ---------------------------------------------------------------------------
// Feynman sessions
// ---------------------------------------------------------------------------

export const sessionsOf = (db: LocalDB, conceptId: string) =>
  Object.values(db.sessions)
    .filter((s) => s.concept_id === conceptId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

/** Stores a scored explanation and sets the concept's mastery to the new score. */
export function addSession(
  db: LocalDB,
  conceptId: string,
  explanation: string,
  evaluation: FeynmanEvaluation,
  newId: NewId,
  now: Date,
): [LocalDB, string] {
  const concept = db.concepts[conceptId];
  if (!concept) throw new NotFoundError('Concept');
  const id = newId();
  return [
    {
      ...db,
      sessions: {
        ...db.sessions,
        [id]: {
          id,
          concept_id: conceptId,
          user_explanation: explanation,
          comprehension_score: evaluation.comprehension_score,
          socratic_question: evaluation.socratic_question,
          jargon_detected: evaluation.jargon_detected,
          misconceptions: evaluation.misconceptions,
          created_at: now.toISOString(),
        },
      },
      concepts: { ...db.concepts, [conceptId]: { ...concept, mastery_level: evaluation.comprehension_score } },
    },
    id,
  ];
}

// ---------------------------------------------------------------------------
// Reviews & stats
// ---------------------------------------------------------------------------

/** Local calendar day, YYYY-MM-DD. */
export function dayKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export function dueCards(db: LocalDB, now: Date, conceptId?: string): Flashcard[] {
  const t = now.getTime();
  return Object.values(db.cards)
    .filter((c) => (!conceptId || c.concept_id === conceptId) && Date.parse(c.review.next_review_date) <= t)
    .sort((a, b) => a.review.next_review_date.localeCompare(b.review.next_review_date));
}

/** Applies an SM-2 grade to a card and counts it in today's review totals. */
export function reviewCard(db: LocalDB, cardId: string, quality: QualityScore, now: Date): LocalDB {
  const card = db.cards[cardId];
  if (!card) throw new NotFoundError('Flashcard');
  const day = dayKey(now);
  const prev = db.reviewDays[day] ?? { reviewed: 0, correct: 0 };
  return {
    ...db,
    cards: { ...db.cards, [cardId]: { ...card, review: calculateNextReview(card.review, quality, now) } },
    reviewDays: { ...db.reviewDays, [day]: { reviewed: prev.reviewed + 1, correct: prev.correct + (quality >= 3 ? 1 : 0) } },
  };
}

export interface StudyStats {
  due_now: number;
  due_today: number;
  reviewed_today: number;
  correct_today: number;
  streak_days: number;
  total_cards: number;
  total_concepts: number;
  avg_mastery: number;
  forecast: { date: string; count: number }[];
  history: { date: string; count: number }[];
}

export function computeStats(db: LocalDB, now: Date): StudyStats {
  const cards = Object.values(db.cards);
  const concepts = Object.values(db.concepts);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueTimes = cards.map((c) => Date.parse(c.review.next_review_date));
  const countBefore = (end: Date) => dueTimes.filter((t) => t < end.getTime()).length;
  const todayStats = db.reviewDays[dayKey(now)] ?? { reviewed: 0, correct: 0 };

  // Consecutive days with reviews, ending today (or yesterday, so an unfinished
  // today doesn't show the streak as lost).
  let cursor = todayStats.reviewed > 0 ? today : addDays(today, -1);
  let streak = 0;
  while ((db.reviewDays[dayKey(cursor)]?.reviewed ?? 0) > 0) {
    streak++;
    cursor = addDays(cursor, -1);
  }

  return {
    due_now: dueTimes.filter((t) => t <= now.getTime()).length,
    due_today: countBefore(addDays(today, 1)),
    reviewed_today: todayStats.reviewed,
    correct_today: todayStats.correct,
    streak_days: streak,
    total_cards: cards.length,
    total_concepts: concepts.length,
    avg_mastery: concepts.length ? Math.round(concepts.reduce((s, c) => s + c.mastery_level, 0) / concepts.length) : 0,
    // Day 0 includes everything overdue.
    forecast: Array.from({ length: 7 }, (_, i) => ({
      date: dayKey(addDays(today, i)),
      count: countBefore(addDays(today, i + 1)) - (i === 0 ? 0 : countBefore(addDays(today, i))),
    })),
    history: Array.from({ length: 7 }, (_, i) => {
      const d = dayKey(addDays(today, i - 6));
      return { date: d, count: db.reviewDays[d]?.reviewed ?? 0 };
    }),
  };
}

// ---------------------------------------------------------------------------
// Backup
// ---------------------------------------------------------------------------

export const BACKUP_FORMAT = 'feynmanmind-backup';

export function toBackup(db: LocalDB, now: Date): string {
  return JSON.stringify({ format: BACKUP_FORMAT, version: 1, exported_at: now.toISOString(), data: db }, null, 2);
}

/** Parses and sanity-checks a backup file. Throws on anything that isn't one. */
export function fromBackup(text: string): LocalDB {
  const parsed = JSON.parse(text) as { format?: unknown; data?: Partial<LocalDB> };
  const d = parsed?.data;
  const isRecord = (v: unknown) => !!v && typeof v === 'object' && !Array.isArray(v);
  if (parsed?.format !== BACKUP_FORMAT || !d || ![d.subjects, d.concepts, d.cards, d.sessions].every(isRecord)) {
    throw new Error('Not a FeynmanMind backup');
  }
  return {
    subjects: d.subjects!,
    concepts: d.concepts!,
    cards: d.cards!,
    sessions: d.sessions!,
    reviewDays: isRecord(d.reviewDays) ? d.reviewDays! : {},
    courses: isRecord(d.courses) ? d.courses! : {},
    lessons: isRecord(d.lessons) ? d.lessons! : {},
    placements: isRecord(d.placements) ? d.placements! : {},
  };
}

// ---------------------------------------------------------------------------
// Guided courses
// ---------------------------------------------------------------------------

export const MASTERED_AT = 71;

/** new → not touched · known → skipped by the placement test · started → in the library · mastered → explained at 71+. */
export type StationStatus = 'new' | 'known' | 'started' | 'mastered';

export interface StationProgress {
  key: string;
  levelIndex: number;
  status: StationStatus;
  conceptId?: string;
  mastery: number;
  /** A lesson is available (built in or already written by the AI). */
  hasLesson: boolean;
}

export interface LevelProgress {
  key: LevelKey;
  total: number;
  /** Mastered or known. */
  done: number;
  known: boolean;
}

export interface CourseProgress {
  stations: StationProgress[];
  levels: LevelProgress[];
  total: number;
  /** Mastered or known through placement. */
  done: number;
  mastered: number;
  started: number;
  /** First station that isn't mastered or known, in course order. */
  nextKey: string | null;
  placement: Placement | null;
}

const courseSubject = (db: LocalDB, courseId: string) => Object.values(db.subjects).find((s) => s.course_id === courseId);
const lessonKey = (courseId: string, stationKey: string) => `${courseId}/${stationKey}`;

/** The station's lesson: built in, or previously written by the AI and saved. */
export function lessonFor(db: LocalDB, course: Course, station: CourseConcept): Lesson | null {
  if (station.explanation && station.cards?.length) return { explanation: station.explanation, cards: station.cards };
  return db.lessons[lessonKey(course.id, station.key)] ?? null;
}

export function saveLesson(db: LocalDB, courseId: string, stationKey: string, lesson: Lesson): LocalDB {
  return { ...db, lessons: { ...db.lessons, [lessonKey(courseId, stationKey)]: lesson } };
}

export function courseProgress(db: LocalDB, course: Course): CourseProgress {
  const subject = courseSubject(db, course.id);
  const placement = db.placements[course.id] ?? null;
  const byKey = new Map(
    subject ? Object.values(db.concepts).filter((c) => c.subject_id === subject.id && c.course_key).map((c) => [c.course_key!, c]) : [],
  );
  const stations = stationsOf(course).map(({ station, levelIndex }): StationProgress => {
    const concept = byKey.get(station.key);
    const hasLesson = lessonFor(db, course, station) !== null;
    if (!concept) {
      const known = placement !== null && levelIndex < placement.levelIndex;
      return { key: station.key, levelIndex, status: known ? 'known' : 'new', mastery: 0, hasLesson };
    }
    return {
      key: station.key,
      levelIndex,
      conceptId: concept.id,
      mastery: concept.mastery_level,
      status: concept.mastery_level >= MASTERED_AT ? 'mastered' : 'started',
      hasLesson,
    };
  });
  const isDone = (s: StationProgress) => s.status === 'mastered' || s.status === 'known';
  return {
    stations,
    levels: course.levels.map((level, i) => {
      const own = stations.filter((s) => s.levelIndex === i);
      return { key: level.key, total: own.length, done: own.filter(isDone).length, known: placement !== null && i < placement.levelIndex };
    }),
    total: stations.length,
    done: stations.filter(isDone).length,
    mastered: stations.filter((s) => s.status === 'mastered').length,
    started: stations.filter((s) => s.status === 'started' || s.status === 'mastered').length,
    nextKey: stations.find((s) => !isDone(s))?.key ?? null,
    placement,
  };
}

/**
 * Starts a station: makes sure the course has its subject in the library,
 * adds the concept and its flashcards (due now). Idempotent: starting an
 * already-started station returns the existing concept.
 */
export function startStation(db: LocalDB, course: Course, key: string, newId: NewId, now: Date): [LocalDB, string] {
  const ref = findStation(course, key);
  if (!ref) throw new NotFoundError('Station');

  let next = db;
  let subject = courseSubject(next, course.id);
  const existing = subject && Object.values(next.concepts).find((c) => c.subject_id === subject!.id && c.course_key === key);
  if (existing) return [next, existing.id];

  const lesson = lessonFor(next, course, ref.station);
  if (!lesson) throw new LessonMissingError();

  if (!subject) {
    // Don't collide with a subject the learner already made with the same name.
    const taken = new Set(Object.values(next.subjects).map((s) => titleKey(s.title)));
    let title = course.title;
    for (let n = 2; taken.has(titleKey(title)); n++) title = `${course.title} (${n})`;
    const id = newId();
    subject = { id, title, created_at: now.toISOString(), course_id: course.id };
    next = { ...next, subjects: { ...next.subjects, [id]: subject } };
  }

  const conceptId = newId();
  const concept: Concept = {
    id: conceptId,
    subject_id: subject.id,
    title: ref.station.title,
    mastery_level: 0,
    // Stagger creation times so the library lists stations in course order.
    created_at: new Date(now.getTime() + ref.index).toISOString(),
    course_key: key,
  };
  next = { ...next, concepts: { ...next.concepts, [conceptId]: concept } };
  [next] = addCards(next, conceptId, lesson.cards, newId, now);
  return [next, conceptId];
}

/** The course and station (with its lesson, if any) a library concept was started from. */
export function stationOf(db: LocalDB, conceptId: string, findCourse: (id: string) => Course | undefined) {
  const concept = db.concepts[conceptId];
  const courseId = concept && db.subjects[concept.subject_id]?.course_id;
  const course = courseId ? findCourse(courseId) : undefined;
  const ref = course && concept?.course_key ? findStation(course, concept.course_key) : undefined;
  if (!course || !ref) return null;
  return { course, station: ref.station, lesson: lessonFor(db, course, ref.station) };
}

export function saveCustomCourse(db: LocalDB, course: Course): LocalDB {
  return { ...db, courses: { ...db.courses, [course.id]: course } };
}

/** Removes an AI course from the catalog, with its saved lessons and placement. Library progress stays. */
export function deleteCustomCourse(db: LocalDB, id: string): LocalDB {
  return {
    ...db,
    courses: omit(db.courses, (c) => c.id === id),
    lessons: Object.fromEntries(Object.entries(db.lessons).filter(([k]) => !k.startsWith(`${id}/`))),
    placements: Object.fromEntries(Object.entries(db.placements).filter(([k]) => k !== id)),
  };
}

// ---------------------------------------------------------------------------
// Placement test
// ---------------------------------------------------------------------------

/** A level is "known" when at least two thirds of its questions were answered correctly. */
export const passesLevel = (correct: number, asked: number) => asked > 0 && correct * 3 >= asked * 2;

export interface PlacementState {
  /** Level currently being tested. */
  levelIndex: number;
  /** Correct answers per finished level. */
  scores: number[];
  done: boolean;
  /** Where the learner lands once done. */
  resultLevel: number;
}

export const startPlacement = (): PlacementState => ({ levelIndex: 0, scores: [], done: false, resultLevel: 0 });

/**
 * Adaptive placement: test the levels bottom-up and stop at the first one the
 * learner doesn't know. Levels without questions end the test there.
 */
export function finishPlacementLevel(course: Course, state: PlacementState, correct: number): PlacementState {
  const level = course.levels[state.levelIndex];
  const scores = [...state.scores, correct];
  const passed = !!level && passesLevel(correct, level.quiz.length);
  const nextIndex = state.levelIndex + 1;
  const canContinue = passed && nextIndex < course.levels.length && course.levels[nextIndex]!.quiz.length > 0;
  if (canContinue) return { levelIndex: nextIndex, scores, done: false, resultLevel: nextIndex };
  // Passing everything still starts you at the top level: 3 questions don't prove master's-level mastery.
  const resultLevel = passed ? Math.min(nextIndex, course.levels.length - 1) : state.levelIndex;
  return { levelIndex: state.levelIndex, scores, done: true, resultLevel };
}

export function savePlacement(db: LocalDB, courseId: string, state: PlacementState, now: Date): LocalDB {
  const placement: Placement = { levelIndex: state.resultLevel, scores: state.scores, taken_at: now.toISOString() };
  return { ...db, placements: { ...db.placements, [courseId]: placement } };
}

// ---------------------------------------------------------------------------
// Standalone concepts
// ---------------------------------------------------------------------------

/**
 * Adds a concept without choosing a subject. It goes into a catch-all subject
 * (created on first use, named `looseTitle`). Returns the existing concept if
 * the same title was already added there.
 */
export function addLooseConcept(db: LocalDB, title: string, looseTitle: string, newId: NewId, now: Date): [LocalDB, string] {
  let next = db;
  let subject = Object.values(next.subjects).find((s) => s.loose);
  if (!subject) {
    const id = newId();
    subject = { id, title: looseTitle, created_at: now.toISOString(), loose: true };
    next = { ...next, subjects: { ...next.subjects, [id]: subject } };
  }
  const existing = Object.values(next.concepts).find((c) => c.subject_id === subject!.id && titleKey(c.title) === titleKey(title));
  if (existing) return [next, existing.id];
  return saveConcept(next, { subjectId: subject.id, title }, newId, now);
}

/** Stores a lesson written for a concept and adds its flashcards. */
export function saveConceptLesson(db: LocalDB, conceptId: string, lesson: Lesson, newId: NewId, now: Date): LocalDB {
  const concept = db.concepts[conceptId];
  if (!concept) throw new NotFoundError('Concept');
  const next = { ...db, concepts: { ...db.concepts, [conceptId]: { ...concept, lesson: lesson.explanation } } };
  return addCards(next, conceptId, lesson.cards, newId, now)[0];
}
