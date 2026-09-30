import { useMutation } from '@tanstack/react-query';
import { askLesson } from '@/api/functions';
import type { LevelKey } from '@/content/types';
import { addQuestion, clearQuestions } from '@/local/logic';
import { getDB, newId, useDBStore } from '@/local/store';
import type { QaTurn } from '@/local/types';

const EMPTY: QaTurn[] = [];

/** The saved questions and answers about one lesson, oldest first. */
export function useQuestionThread(threadKey: string): QaTurn[] {
  return useDBStore((s) => s.db.questions[threadKey] ?? EMPTY);
}

export interface AskContext {
  threadKey: string;
  conceptTitle: string;
  lesson: string;
  level: LevelKey | 'standalone';
  language: 'he' | 'en';
}

/** Asks the AI about a lesson (with the last few turns as context) and saves the answer on the device. */
export function useAskQuestion() {
  return useMutation({
    mutationFn: async ({ context, question }: { context: AskContext; question: string }) => {
      const history = (getDB().questions[context.threadKey] ?? []).slice(-6).map(({ question: q, answer }) => ({ question: q, answer }));
      const res = await askLesson({
        concept_title: context.conceptTitle,
        lesson: context.lesson,
        level: context.level,
        history,
        question,
        language: context.language,
      });
      const turn: QaTurn = { id: newId(), question, answer: res.answer, follow_ups: res.follow_ups, asked_at: new Date().toISOString() };
      useDBStore.getState().update((db) => addQuestion(db, context.threadKey, turn));
      return turn;
    },
  });
}

export function clearThread(threadKey: string) {
  useDBStore.getState().update((db) => clearQuestions(db, threadKey));
}
