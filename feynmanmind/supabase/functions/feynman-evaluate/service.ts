import { HttpError, requireText, stringList } from '../_shared/http.ts';
import { parseLanguage } from '../_shared/language.ts';
import type { StructuredLlm } from '../_shared/llm.ts';
import {
  buildFeynmanUserMessage,
  FEYNMAN_PROMPT_VERSION,
  FEYNMAN_RESPONSE_SCHEMA,
  FEYNMAN_SYSTEM_PROMPT,
  type ChatTurn,
  type FeynmanEvaluation,
  parseFeynmanEvaluation,
} from '../_shared/feynman-tutor.ts';

export const MIN_EXPLANATION_CHARS = 20;
/** A reply in an ongoing conversation (e.g. a short answer to the tutor's question). */
export const MIN_REPLY_CHARS = 2;
const MAX_TURNS = 12;
export const MAX_EXPLANATION_CHARS = 8000;

export interface EvaluateInput {
  subjectTitle: string;
  conceptTitle: string;
  /** The newest learner message: the explanation, or a reply in the conversation. */
  explanation: string;
  /** Earlier turns of this conversation, oldest first (empty for a first explanation). */
  conversation: ChatTurn[];
  /** Reply language name. */
  language: string;
  /** Recent Socratic questions for this concept, so the tutor doesn't repeat itself. */
  previousQuestions: string[];
  /** The learner's own flashcards for the concept, used as ground truth. */
  referenceCards: { question: string; answer: string }[];
  /** The lesson the learner studied (guided courses), also ground truth. */
  referenceText: string;
}

export interface EvaluateResult {
  prompt_version: string;
  evaluation: FeynmanEvaluation;
}

/**
 * The app stores everything locally, so the request carries all context the
 * tutor needs. Nothing is persisted server-side.
 */
export function parseEvaluateInput(body: Record<string, unknown>): EvaluateInput {
  const conversation = parseConversation(body.conversation);
  return {
    subjectTitle: requireText(body.subject_title, 'subject_title', 1, 200),
    conceptTitle: requireText(body.concept_title, 'concept_title', 1, 200),
    explanation: requireText(body.explanation, 'explanation', conversation.length ? MIN_REPLY_CHARS : MIN_EXPLANATION_CHARS, MAX_EXPLANATION_CHARS),
    conversation,
    language: parseLanguage(body.language),
    previousQuestions: stringList(body.previous_questions, 'previous_questions', 5, 500),
    referenceCards: parseCards(body.reference_cards),
    referenceText: typeof body.reference_text === 'string' ? body.reference_text.trim().slice(0, 6000) : '',
  };
}

function parseConversation(value: unknown): ChatTurn[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new HttpError(400, 'conversation must be an array', 'invalid_input');
  const turns: ChatTurn[] = [];
  for (const turn of value) {
    const { role, text } = (turn ?? {}) as Record<string, unknown>;
    if ((role !== 'learner' && role !== 'tutor') || typeof text !== 'string' || !text.trim()) continue;
    turns.push({ role, text: text.trim().slice(0, role === 'learner' ? MAX_EXPLANATION_CHARS : 2000) });
  }
  // Keep the first turn (the original explanation) and the most recent ones.
  return turns.length > MAX_TURNS ? [turns[0]!, ...turns.slice(-(MAX_TURNS - 1))] : turns;
}

function parseCards(value: unknown): { question: string; answer: string }[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new HttpError(400, 'reference_cards must be an array', 'invalid_input');
  const cards: { question: string; answer: string }[] = [];
  for (const c of value) {
    const { question, answer } = (c ?? {}) as Record<string, unknown>;
    if (typeof question !== 'string' || typeof answer !== 'string' || !question.trim() || !answer.trim()) continue;
    cards.push({ question: question.trim().slice(0, 1000), answer: answer.trim().slice(0, 2000) });
    if (cards.length === 30) break;
  }
  return cards;
}

export async function evaluateExplanation(llm: StructuredLlm, input: EvaluateInput): Promise<EvaluateResult> {
  const evaluation = await llm({
    name: 'feynman_evaluation',
    system: FEYNMAN_SYSTEM_PROMPT,
    user: buildFeynmanUserMessage({
      subjectTitle: input.subjectTitle,
      conceptTitle: input.conceptTitle,
      referenceMaterial: [input.referenceText, formatReference(input.referenceCards)].filter(Boolean).join('\n\n') || undefined,
      previousQuestions: input.previousQuestions,
      userExplanation: input.explanation,
      conversation: input.conversation,
      language: input.language,
    }),
    schema: FEYNMAN_RESPONSE_SCHEMA,
    parse: (raw) =>
      parseFeynmanEvaluation(raw, [input.explanation, ...input.conversation.filter((t) => t.role === 'learner').map((t) => t.text)].join('\n')),
    temperature: 0.3,
    maxOutputTokens: 1500,
  });
  return { prompt_version: FEYNMAN_PROMPT_VERSION, evaluation };
}

function formatReference(cards: { question: string; answer: string }[]): string | undefined {
  if (!cards.length) return undefined;
  let out = '';
  for (const c of cards) {
    const line = `Q: ${c.question}\nA: ${c.answer}\n`;
    if (out.length + line.length > 4000) break;
    out += line;
  }
  return out.trim();
}
