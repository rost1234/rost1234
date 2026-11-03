/**
 * POST /functions/v1/generate-lesson   (public, stateless)
 * Body: {
 *   "concept_title": string, "summary"?: string, "course_title"?: string,
 *   "level"?: "foundations" | "advanced" | "bachelor" | "master" | "standalone",
 *   "previous_titles"?: string[], "language"?: "he" | "en"
 * }
 * Response: { prompt_version, lesson: { explanation, cards: [{ question, answer }] } }
 * Errors:   400 invalid_input · 422 invalid_topic · 429 rate_limited · 502 llm_error
 */
import { handle, json, readJsonBody } from '../_shared/http.ts';
import { createStructuredLlm, llmConfigFromEnv } from '../_shared/llm.ts';
import { clientKey, createRateLimiter } from '../_shared/rateLimit.ts';
import { parseLessonInput, writeLesson } from './service.ts';

const llm = createStructuredLlm({ ...llmConfigFromEnv(), timeoutMs: 90_000 });
// Enough for writing a whole course (the app paces itself and waits when this is reached).
const limit = createRateLimiter(150, 60 * 60 * 1000);

Deno.serve(handle(async (req) => {
  limit(clientKey(req));
  const input = parseLessonInput(await readJsonBody(req, 16 * 1024));
  return json(await writeLesson(llm, input));
}));
