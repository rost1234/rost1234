/**
 * POST /functions/v1/generate-course   (public, stateless)
 * Body:     { "topic": string, "language"?: "he" | "en" }
 * Response: { prompt_version, course: { title, description, concepts: [{ key, title, summary, explanation, cards }] } }
 * Errors:   400 invalid_input · 422 invalid_topic · 429 rate_limited · 502 llm_error
 */
import { handle, json, readJsonBody } from '../_shared/http.ts';
import { createStructuredLlm, llmConfigFromEnv } from '../_shared/llm.ts';
import { clientKey, createRateLimiter } from '../_shared/rateLimit.ts';
import { generateCourse, parseCourseInput } from './service.ts';

const llm = createStructuredLlm({ ...llmConfigFromEnv(), timeoutMs: 120_000 });
// A whole course is one large request; keep it tighter than the tutor.
const limit = createRateLimiter(10, 60 * 60 * 1000);

Deno.serve(handle(async (req) => {
  limit(clientKey(req));
  const input = parseCourseInput(await readJsonBody(req, 8 * 1024));
  return json(await generateCourse(llm, input));
}));
