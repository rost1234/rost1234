import { useMutation, useQuery } from '@tanstack/react-query';
import { evaluateExplanation } from '@/api/functions';
import { addSession, cardsOf, sessionsOf } from '@/local/logic';
import { commit, getDB, newId } from '@/local/store';
import { NotFoundError, type FeynmanSession } from '@/local/types';
import { keys } from './keys';
import { read } from './local';

export type SessionRow = FeynmanSession;

export function useSessions(conceptId: string) {
  return useQuery({
    queryKey: keys.sessions(conceptId),
    queryFn: () => read(() => sessionsOf(getDB(), conceptId)),
  });
}

export function useSession(id: string) {
  return useQuery({
    queryKey: keys.session(id),
    queryFn: () =>
      read(() => {
        const s = getDB().sessions[id];
        if (!s) throw new NotFoundError('Session');
        return s;
      }),
  });
}

/** Sends the explanation (with the concept's context) to the AI tutor and stores the result locally. */
export function useEvaluateExplanation(conceptId: string) {
  return useMutation({
    mutationFn: async (explanation: string) => {
      const db = getDB();
      const concept = db.concepts[conceptId];
      const subject = concept && db.subjects[concept.subject_id];
      if (!concept || !subject) throw new NotFoundError('Concept');
      const response = await evaluateExplanation({
        subject_title: subject.title,
        concept_title: concept.title,
        explanation,
        previous_questions: sessionsOf(db, conceptId)
          .map((s) => s.socratic_question)
          .filter((q): q is string => !!q)
          .slice(0, 5),
        reference_cards: cardsOf(db, conceptId)
          .slice(0, 20)
          .map((c) => ({ question: c.question, answer: c.answer })),
      });
      const sessionId = commit((current) => addSession(current, conceptId, explanation, response.evaluation, newId, new Date()));
      return { session_id: sessionId, evaluation: response.evaluation };
    },
  });
}
