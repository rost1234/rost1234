/** Typed wrappers for the FeynmanMind Edge Functions. */
import { FunctionsHttpError, type SupabaseClient } from '@supabase/supabase-js';
import type { FeynmanEvaluation } from '../../supabase/functions/_shared/feynman-tutor.ts';

export type { FeynmanEvaluation };

export interface EvaluateResponse {
  session_id: string;
  prompt_version: string;
  evaluation: FeynmanEvaluation;
}

export interface GenerateFlashcardsResponse {
  prompt_version: string;
  cards: { id: string; question: string; answer: string }[];
  chunks_processed: number;
  source_truncated: boolean;
}

export type ApiErrorCode =
  | 'invalid_input'
  | 'invalid_json'
  | 'unauthorized'
  | 'not_found'
  | 'payload_too_large'
  | 'source_too_short'
  | 'unreadable_pdf'
  | 'rate_limited'
  | 'llm_error'
  | 'db_error'
  | 'internal'
  | 'network';

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Worth offering a "try again" button for. */
  get retryable(): boolean {
    return this.code === 'llm_error' || this.code === 'network' || this.code === 'internal';
  }
}

async function invoke<T>(client: SupabaseClient, name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await client.functions.invoke<T>(name, { body });
  if (!error) return data as T;

  if (error instanceof FunctionsHttpError) {
    const res = error.context as Response;
    const payload = await res.json().catch(() => null);
    const e = payload?.error;
    throw new ApiError(e?.code ?? 'internal', e?.message ?? 'Request failed', res.status);
  }
  throw new ApiError('network', error.message);
}

export function evaluateExplanation(client: SupabaseClient, conceptId: string, explanation: string) {
  return invoke<EvaluateResponse>(client, 'feynman-evaluate', { concept_id: conceptId, explanation });
}

export function generateFlashcards(
  client: SupabaseClient,
  conceptId: string,
  source: { text: string } | { pdfBase64: string },
  maxCards?: number,
) {
  return invoke<GenerateFlashcardsResponse>(client, 'generate-flashcards', {
    concept_id: conceptId,
    ...('text' in source ? { text: source.text } : { pdf_base64: source.pdfBase64 }),
    ...(maxCards ? { max_cards: maxCards } : {}),
  });
}
