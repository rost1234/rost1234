/**
 * Client for the two stateless AI Edge Functions. The app keeps all data on
 * the device and sends only the context each request needs.
 */
import type { FeynmanEvaluation } from '../../supabase/functions/_shared/feynman-tutor.ts';
import { aiBaseUrl, aiKey, isAiConfigured } from '@/lib/env';

export type { FeynmanEvaluation };

export interface EvaluateRequest {
  subject_title: string;
  concept_title: string;
  explanation: string;
  previous_questions: string[];
  reference_cards: { question: string; answer: string }[];
}

export interface EvaluateResponse {
  prompt_version: string;
  evaluation: FeynmanEvaluation;
}

export interface GenerateRequest {
  subject_title: string;
  concept_title: string;
  source: { text: string } | { pdfBase64: string };
  max_cards: number;
  existing_questions: string[];
}

export interface GenerateFlashcardsResponse {
  prompt_version: string;
  cards: { question: string; answer: string }[];
  chunks_processed: number;
  source_truncated: boolean;
}

export type ApiErrorCode =
  | 'not_configured'
  | 'invalid_input'
  | 'invalid_json'
  | 'payload_too_large'
  | 'source_too_short'
  | 'unreadable_pdf'
  | 'rate_limited'
  | 'llm_error'
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

async function call<T>(name: string, body: Record<string, unknown>): Promise<T> {
  if (!isAiConfigured) throw new ApiError('not_configured', 'AI server is not configured');
  let res: Response;
  try {
    res = await fetch(`${aiBaseUrl}/functions/v1/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: aiKey, Authorization: `Bearer ${aiKey}` },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new ApiError('network', (e as Error).message);
  }
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const e = payload?.error;
    throw new ApiError(e?.code ?? 'internal', e?.message ?? `Request failed (${res.status})`, res.status);
  }
  return payload as T;
}

export function evaluateExplanation(request: EvaluateRequest) {
  return call<EvaluateResponse>('feynman-evaluate', { ...request });
}

export function generateFlashcards({ source, ...rest }: GenerateRequest) {
  return call<GenerateFlashcardsResponse>('generate-flashcards', {
    ...rest,
    ...('text' in source ? { text: source.text } : { pdf_base64: source.pdfBase64 }),
  });
}
