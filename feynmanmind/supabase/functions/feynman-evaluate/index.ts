/**
 * POST /functions/v1/feynman-evaluate
 * Body:     { "concept_id": uuid, "explanation": string }
 * Response: { session_id, prompt_version, evaluation: FeynmanEvaluation }
 * Errors:   400 invalid_input · 401 unauthorized · 404 not_found
 *           429 rate_limited · 502 llm_error
 */
import { handle, json, readJsonBody } from '../_shared/http.ts';
import { createStructuredLlm, llmConfigFromEnv } from '../_shared/llm.ts';
import { getAdminClient, getUserClient } from '../_shared/supabase.ts';
import { createFeynmanRepo } from './repo.ts';
import { evaluateExplanation, parseEvaluateInput } from './service.ts';

const llm = createStructuredLlm(llmConfigFromEnv());
const admin = getAdminClient();

Deno.serve(handle(async (req) => {
  const { client } = await getUserClient(req);
  const input = parseEvaluateInput(await readJsonBody(req, 64 * 1024));
  const result = await evaluateExplanation({ repo: createFeynmanRepo(client, admin), llm }, input);
  return json(result);
}));
