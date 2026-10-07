import { HttpError, requireText } from '../_shared/http.ts';
import { parseLanguage } from '../_shared/language.ts';
import type { StructuredLlm } from '../_shared/llm.ts';
import { buildQaUserMessage, type LessonAnswer, parseAnswer, QA_PROMPT_VERSION, QA_RESPONSE_SCHEMA, QA_SYSTEM_PROMPT } from '../_shared/lesson-qa.ts';

const LEVELS: Record<string, string> = {
  foundations: 'foundations (curious beginner, no background)',
  advanced: 'advanced (strong high-school)',
  bachelor: "bachelor's degree",
  master: "master's degree",
  standalone: 'general adult learner',
};

export interface AskInput {
  language: string;
  level: string;
  conceptTitle: string;
  lesson: string;
  history: { question: string; answer: string }[];
  question: string;
  /** Set when the learner asks what the Feynman tutor's question means (clarify, never answer). */
  tutorQuestion?: string;
}

export function parseAskInput(body: Record<string, unknown>): AskInput {
  const level = typeof body.level === 'string' ? body.level : 'standalone';
  if (!LEVELS[level]) throw new HttpError(400, 'unknown level', 'invalid_input');
  const language = parseLanguage(body.language);
  if (body.history !== undefined && !Array.isArray(body.history)) throw new HttpError(400, 'history must be an array', 'invalid_input');
  // Only the last few turns: enough for follow-ups, bounded in size.
  const history = ((body.history ?? []) as Record<string, unknown>[])
    .filter((h) => typeof h?.question === 'string' && typeof h?.answer === 'string')
    .slice(-6)
    .map((h) => ({ question: (h.question as string).trim().slice(0, 500), answer: (h.answer as string).trim().slice(0, 1500) }));
  return {
    language,
    level: LEVELS[level]!,
    conceptTitle: requireText(body.concept_title, 'concept_title', 1, 200),
    lesson: typeof body.lesson === 'string' ? body.lesson.trim().slice(0, 6000) : '',
    history,
    question: requireText(body.question, 'question', 2, 500),
    tutorQuestion: typeof body.tutor_question === 'string' && body.tutor_question.trim() ? body.tutor_question.trim().slice(0, 500) : undefined,
  };
}

export async function answerQuestion(llm: StructuredLlm, input: AskInput): Promise<{ prompt_version: string } & LessonAnswer> {
  const result = await llm({
    name: 'lesson_answer',
    system: QA_SYSTEM_PROMPT,
    user: buildQaUserMessage(input),
    schema: QA_RESPONSE_SCHEMA,
    parse: parseAnswer,
    temperature: 0.3,
    maxOutputTokens: 1500,
  });
  return { prompt_version: QA_PROMPT_VERSION, ...result };
}
