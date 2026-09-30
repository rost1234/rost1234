/**
 * POST /functions/v1/ask-lesson   (public, stateless)
 * Body: {
 *   "concept_title": string, "question": string, "lesson"?: string,
 *   "level"?: "foundations" | "advanced" | "bachelor" | "master" | "standalone",
 *   "history"?: [{ "question": string, "answer": string }], "language"?: "he" | "en"
 * }
 * Response: { prompt_version, answer, follow_ups: string[] }
 * Errors:   400 invalid_input · 429 rate_limited · 502 llm_error
 */
import { handle, json, readJsonBody } from '../_shared/http.ts';
import { createStructuredLlm, llmConfigFromEnv } from '../_shared/llm.ts';
import { clientKey, createRateLimiter } from '../_shared/rateLimit.ts';
import { answerQuestion, parseAskInput } from './service.ts';

const llm = createStructuredLlm({ ...llmConfigFromEnv(), timeoutMs: 60_000 });
const limit = createRateLimiter(60, 60 * 60 * 1000);

Deno.serve(handle(async (req) => {
  limit(clientKey(req));
  const input = parseAskInput(await readJsonBody(req, 32 * 1024));
  return json(await answerQuestion(llm, input));
}));
