/**
 * POST /functions/v1/generate-flashcards
 * Body:     { "concept_id": uuid, "text": string }
 *        or { "concept_id": uuid, "pdf_base64": string }   (≤ 10 MB, text-based PDF)
 *           optional "max_cards": 1–50 (default 20)
 * Response: { prompt_version, cards: [{ id, question, answer }], chunks_processed, source_truncated }
 * Errors:   400 invalid_input · 401 unauthorized · 404 not_found · 413 payload_too_large
 *           422 source_too_short | unreadable_pdf · 429 rate_limited · 502 llm_error
 */
import { extractText, getDocumentProxy } from 'npm:unpdf@1';
import { handle, json, readJsonBody } from '../_shared/http.ts';
import { createStructuredLlm, llmConfigFromEnv } from '../_shared/llm.ts';
import { getUserClient } from '../_shared/supabase.ts';
import { createFlashcardRepo } from './repo.ts';
import { generateFlashcards, parseGenerateInput } from './service.ts';

const llm = createStructuredLlm(llmConfigFromEnv());

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

Deno.serve(handle(async (req) => {
  const { client } = await getUserClient(req);
  // base64 inflates by 4/3: a 10 MB PDF is ~13.4 MB of JSON.
  const input = parseGenerateInput(await readJsonBody(req, 14 * 1024 * 1024));
  const result = await generateFlashcards({ repo: createFlashcardRepo(client), llm, extractPdfText }, input);
  return json(result, result.cards.length ? 201 : 200);
}));
