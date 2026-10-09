import { useMutation } from '@tanstack/react-query';
import { askLesson, evaluateExplanation } from '@/api/functions';
import type { LessonParts } from '@/content/lesson';
import type { LevelKey } from '@/content/types';
import { addCards, addSession, addTutorTurns, cardsOf, clearTutorChat, revealTutorHelp, sessionsOf, stationOf, tutorConversation } from '@/local/logic';
import { commit, getDB, newId, useDBStore } from '@/local/store';
import { NotFoundError, type LocalDB, type TutorTurn } from '@/local/types';
import { findCourse } from './courses';

const EMPTY: TutorTurn[] = [];

/** The conversation with the tutor about one concept, oldest first. */
export function useTutorChat(conceptId: string): TutorTurn[] {
  return useDBStore((s) => s.db.tutorChats[conceptId] ?? EMPTY);
}

/** The lesson behind a concept (its course station's, or its own), to peek at while explaining. */
export interface ConceptLesson {
  text: string;
  parts?: LessonParts;
  keyPoints: { question: string; answer: string }[];
  level: LevelKey | 'standalone';
}

export function conceptLesson(db: LocalDB, conceptId: string): ConceptLesson | null {
  const station = stationOf(db, conceptId, findCourse);
  if (station?.lesson)
    return {
      text: station.lesson.explanation,
      parts: station.lesson.parts,
      keyPoints: station.lesson.cards,
      level: station.course.levels.find((l) => l.stations.includes(station.station))?.key ?? 'standalone',
    };
  const concept = db.concepts[conceptId];
  return concept?.lesson
    ? { text: concept.lesson, parts: concept.lessonParts, keyPoints: cardsOf(db, conceptId).slice(0, 6).map((c) => ({ question: c.question, answer: c.answer })), level: 'standalone' }
    : null;
}

/** The concept's level (for the tutor): its course station's, or standalone. */
const conceptLevel = (db: LocalDB, conceptId: string): LevelKey | 'standalone' => {
  const station = stationOf(db, conceptId, findCourse);
  return station?.course.levels.find((l) => l.stations.includes(station.station))?.key ?? 'standalone';
};

export type TutorMessageKind = 'explanation' | 'revision' | 'answer';

/**
 * Sends a message to the tutor: a first explanation, a rewritten one, or an answer to its question.
 * The tutor gets the conversation so far, so an answer is judged in the context of what you explained.
 * Both messages are saved on the device, and the score updates the concept's mastery.
 */
export function useSendToTutor(conceptId: string) {
  return useMutation({
    mutationFn: async ({ text, kind }: { text: string; kind: TutorMessageKind }) => {
      const db = getDB();
      const concept = db.concepts[conceptId];
      const subject = concept && db.subjects[concept.subject_id];
      if (!concept || !subject) throw new NotFoundError('Concept');
      const chat = kind === 'explanation' ? [] : (db.tutorChats[conceptId] ?? []);
      const sessions = sessionsOf(db, conceptId);
      const { evaluation } = await evaluateExplanation({
        subject_title: subject.title,
        concept_title: concept.title,
        explanation: text,
        conversation: tutorConversation(chat),
        level: conceptLevel(db, conceptId),
        // What was missing in earlier attempts, so the tutor can check whether it's fixed now.
        previous_gaps: sessions
          .map((s) => s.primary_gap)
          .filter((g): g is string => !!g)
          .slice(0, 3),
        previous_questions: sessions
          .map((s) => s.socratic_question)
          .filter((q): q is string => !!q)
          .slice(0, 5),
        reference_cards: cardsOf(db, conceptId)
          .slice(0, 20)
          .map((c) => ({ question: c.question, answer: c.answer })),
        reference_text: conceptLesson(db, conceptId)?.text,
        language: 'he',
      });
      const at = new Date();
      const tutor: TutorTurn = {
        id: newId(),
        role: 'tutor',
        kind: 'feedback',
        text: evaluation.feedback || evaluation.encouragement,
        at: at.toISOString(),
        evaluation: {
          score: evaluation.comprehension_score,
          question: evaluation.socratic_question,
          // Older servers don't say; a question to answer is the safe default.
          next_step: evaluation.next_step ?? 'answer_question',
          refine_quote: evaluation.refine_quote ?? '',
          primary_gap: evaluation.primary_gap,
          misconceptions: evaluation.misconceptions,
          jargon: evaluation.jargon_detected,
          coverage: evaluation.coverage ?? [],
          hints: evaluation.hints ?? [],
          question_answer: evaluation.question_answer ?? '',
          model_explanation: evaluation.model_explanation ?? '',
          shown: { hints: 0, answer: false, model: false },
        },
      };
      commit((current) => {
        // A first explanation starts a fresh conversation.
        const base = kind === 'explanation' ? clearTutorChat(current, conceptId) : current;
        const [withSession, id] = addSession(base, conceptId, text, evaluation, newId, at);
        return [addTutorTurns(withSession, conceptId, [{ id: newId(), role: 'learner', kind, text, at: at.toISOString() }, tutor]), id];
      });
      return tutor;
    },
  });
}

/** "I didn't understand the question": the AI explains what the tutor is asking, without the answer. */
export function useClarifyTutorQuestion(conceptId: string) {
  return useMutation({
    mutationFn: async ({ question, tutorQuestion }: { question: string; tutorQuestion: string }) => {
      const db = getDB();
      const concept = db.concepts[conceptId];
      if (!concept) throw new NotFoundError('Concept');
      const lesson = conceptLesson(db, conceptId);
      const res = await askLesson({
        concept_title: concept.title,
        lesson: lesson?.text,
        level: 'standalone',
        question,
        tutor_question: tutorQuestion,
        language: 'he',
      });
      const at = new Date().toISOString();
      useDBStore.getState().update((current) =>
        addTutorTurns(current, conceptId, [
          { id: newId(), role: 'learner', kind: 'clarify', text: question, at },
          { id: newId(), role: 'tutor', kind: 'clarification', text: res.answer, at },
        ]),
      );
    },
  });
}

/** Opens the next hint, the answer to the tutor's question, or the model explanation. */
export function revealHelp(conceptId: string, turnId: string, what: 'hint' | 'answer' | 'model') {
  useDBStore.getState().update((db) => revealTutorHelp(db, conceptId, turnId, what));
}

/** Turns the tutor's question and its answer into a flashcard (returns false if it already exists). */
export function addCardFromTutor(conceptId: string, question: string, answer: string): boolean {
  const added = commit((db) => addCards(db, conceptId, [{ question, answer }], newId, new Date()));
  return added.length > 0;
}

export function resetTutorChat(conceptId: string) {
  useDBStore.getState().update((db) => clearTutorChat(db, conceptId));
}
