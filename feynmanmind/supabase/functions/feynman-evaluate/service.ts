import { HttpError, requireUuid } from '../_shared/http.ts';
import type { StructuredLlm } from '../_shared/llm.ts';
import {
  buildFeynmanUserMessage,
  FEYNMAN_PROMPT_VERSION,
  FEYNMAN_RESPONSE_SCHEMA,
  FEYNMAN_SYSTEM_PROMPT,
  type FeynmanEvaluation,
  parseFeynmanEvaluation,
} from '../_shared/feynman-tutor.ts';

export const MIN_EXPLANATION_CHARS = 20;
export const MAX_EXPLANATION_CHARS = 8000;
export const MAX_SESSIONS_PER_HOUR = 30;

export interface ConceptInfo {
  id: string;
  title: string;
  subjectTitle: string;
}

/** Data access for this function; the Supabase version lives in repo.ts. */
export interface FeynmanRepo {
  /** null when the concept doesn't exist or isn't the caller's. */
  getConcept(conceptId: string): Promise<ConceptInfo | null>;
  /** The caller's sessions, across all concepts, since `since`. */
  countSessionsSince(since: Date): Promise<number>;
  previousQuestions(conceptId: string, limit: number): Promise<string[]>;
  referenceCards(conceptId: string, limit: number): Promise<{ question: string; answer: string }[]>;
  createSession(conceptId: string, explanation: string): Promise<string>;
  saveEvaluation(sessionId: string, evaluation: FeynmanEvaluation): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
}

export interface EvaluateResult {
  session_id: string;
  prompt_version: string;
  evaluation: FeynmanEvaluation;
}

export function parseEvaluateInput(body: Record<string, unknown>) {
  const conceptId = requireUuid(body.concept_id, 'concept_id');
  const explanation = typeof body.explanation === 'string' ? body.explanation.trim() : '';
  if (explanation.length < MIN_EXPLANATION_CHARS) {
    throw new HttpError(400, `explanation must be at least ${MIN_EXPLANATION_CHARS} characters`, 'invalid_input');
  }
  if (explanation.length > MAX_EXPLANATION_CHARS) {
    throw new HttpError(400, `explanation must be at most ${MAX_EXPLANATION_CHARS} characters`, 'invalid_input');
  }
  return { conceptId, explanation };
}

export async function evaluateExplanation(
  deps: { repo: FeynmanRepo; llm: StructuredLlm; now?: () => Date },
  input: { conceptId: string; explanation: string },
): Promise<EvaluateResult> {
  const { repo, llm } = deps;
  const now = deps.now?.() ?? new Date();

  const concept = await repo.getConcept(input.conceptId);
  if (!concept) throw new HttpError(404, 'Concept not found', 'not_found');

  const recent = await repo.countSessionsSince(new Date(now.getTime() - 60 * 60 * 1000));
  if (recent >= MAX_SESSIONS_PER_HOUR) {
    throw new HttpError(429, 'Too many explanations this hour, take a break and try again soon', 'rate_limited');
  }

  const [previousQuestions, cards] = await Promise.all([
    repo.previousQuestions(concept.id, 5),
    repo.referenceCards(concept.id, 20),
  ]);

  // Insert first, as the user: RLS validates ownership before any tokens are
  // spent, and the row id is ready for the service-role update.
  const sessionId = await repo.createSession(concept.id, input.explanation);

  let evaluation: FeynmanEvaluation;
  try {
    evaluation = await llm({
      name: 'feynman_evaluation',
      system: FEYNMAN_SYSTEM_PROMPT,
      user: buildFeynmanUserMessage({
        subjectTitle: concept.subjectTitle,
        conceptTitle: concept.title,
        referenceMaterial: formatReference(cards),
        previousQuestions,
        userExplanation: input.explanation,
      }),
      schema: FEYNMAN_RESPONSE_SCHEMA,
      parse: parseFeynmanEvaluation,
      temperature: 0.3,
      maxOutputTokens: 1500,
    });
  } catch (err) {
    // Don't leave an unscored attempt behind; the client simply resubmits.
    await repo.deleteSession(sessionId).catch((e) => console.error('[feynman] cleanup failed', e));
    throw err;
  }

  await repo.saveEvaluation(sessionId, evaluation);
  return { session_id: sessionId, prompt_version: FEYNMAN_PROMPT_VERSION, evaluation };
}

/** The user's own flashcards act as the ground truth the tutor judges against. */
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
