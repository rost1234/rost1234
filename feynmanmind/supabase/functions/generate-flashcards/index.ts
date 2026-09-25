/**
 * POST /functions/v1/generate-flashcards   (public, stateless)
 * Body: {
 *   "subject_title": string, "concept_title": string,
 *   "text": string  |  "pdf_base64": string (≤ 10 MB, text-based PDF),
 *   "max_cards"?: 1–50 (default 20), "existing_questions"?: string[]
 * }
 * Response: { prompt_version, cards: [{ question, answer }], chunks_processed, source_truncated }
 * Errors:   400 invalid_input · 413 payload_too_large · 422 source_too_short | unreadable_pdf
 *           429 rate_limited · 502 llm_error
 */
import { extractText, getDocumentProxy } from 'npm:unpdf@1';
import { handle, json, readJsonBody } from '../_shared/http.ts';
import { createStructuredLlm, llmConfigFromEnv } from '../_shared/llm.ts';
import { clientKey, createRateLimiter } from '../_shared/rateLimit.ts';
import { generateFlashcards, parseGenerateInput } from './service.ts';

const llm = createStructuredLlm(llmConfigFromEnv());
// Each request can make up to 10 model calls, so this is tighter than the tutor's.
const limit = createRateLimiter(15, 60 * 60 * 1000);

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

Deno.serve(handle(async (req) => {
  limit(clientKey(req));
  // base64 inflates by 4/3: a 10 MB PDF is ~13.4 MB of JSON.
  const input = parseGenerateInput(await readJsonBody(req, 14 * 1024 * 1024));
  return json(await generateFlashcards({ llm, extractPdfText }, input));
}));
