/**
 * POST /functions/v1/feynman-evaluate   (public, stateless)
 * Body: {
 *   "subject_title": string, "concept_title": string, "explanation": string,
 *   "previous_questions"?: string[], "reference_cards"?: [{ "question", "answer" }]
 * }
 * Response: { prompt_version, evaluation: FeynmanEvaluation }
 * Errors:   400 invalid_input · 429 rate_limited · 502 llm_error
 */
import { handle, json, readJsonBody } from '../_shared/http.ts';
import { createStructuredLlm, llmConfigFromEnv } from '../_shared/llm.ts';
import { clientKey, createRateLimiter } from '../_shared/rateLimit.ts';
import { evaluateExplanation, parseEvaluateInput } from './service.ts';

const llm = createStructuredLlm(llmConfigFromEnv());
const limit = createRateLimiter(30, 60 * 60 * 1000);

Deno.serve(handle(async (req) => {
  limit(clientKey(req));
  const input = parseEvaluateInput(await readJsonBody(req, 128 * 1024));
  return json(await evaluateExplanation(llm, input));
}));
