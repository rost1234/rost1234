/**
 * Client for the stateless AI Edge Functions. The app keeps all data on
 * the device and sends only the context each request needs.
 */
import type { FeynmanEvaluation as ServerEvaluation } from '../../supabase/functions/_shared/feynman-tutor.ts';
import type { LevelKey } from '@/content/types';
import { getAiConfig, type AiConfig } from '@/lib/env';

/** The tutor's evaluation. The conversation fields are optional: a server not yet updated doesn't send them. */
export type FeynmanEvaluation = Omit<ServerEvaluation, 'feedback' | 'next_step' | 'refine_quote'> &
  Partial<Pick<ServerEvaluation, 'feedback' | 'next_step' | 'refine_quote'>>;

export interface EvaluateRequest {
  subject_title: string;
  concept_title: string;
  explanation: string;
  previous_questions: string[];
  reference_cards: { question: string; answer: string }[];
  /** The lesson text, for concepts from a guided course. */
  reference_text?: string;
  /** Earlier turns of the conversation with the tutor (empty for a first explanation). */
  conversation?: { role: 'learner' | 'tutor'; text: string }[];
  language: 'he' | 'en';
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
  | 'invalid_topic'
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

async function call<T>(name: string, body: Record<string, unknown>, config: AiConfig | null = getAiConfig()): Promise<T> {
  if (!config) throw new ApiError('not_configured', 'AI server is not configured');
  let res: Response;
  try {
    res = await fetch(`${config.url}/functions/v1/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: config.key, Authorization: `Bearer ${config.key}` },
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

export interface GeneratedCourse {
  title: string;
  description: string;
  levels: {
    key: LevelKey;
    stations: { key: string; title: string; summary: string; unit?: string }[];
    quiz: { question: string; options: string[]; correct: number }[];
  }[];
}

export interface LessonRequest {
  concept_title: string;
  summary?: string;
  /** The unit (usually a real university course) the station belongs to. */
  unit?: string;
  course_title?: string;
  level: LevelKey | 'standalone';
  previous_titles?: string[];
  language: 'he' | 'en';
}

export function generateLesson(request: LessonRequest) {
  return call<{ prompt_version: string; lesson: { explanation: string; cards: { question: string; answer: string }[] } }>('generate-lesson', {
    ...request,
  });
}

export interface AskLessonRequest {
  concept_title: string;
  question: string;
  lesson?: string;
  level: LevelKey | 'standalone';
  history?: { question: string; answer: string }[];
  language: 'he' | 'en';
  /** Asking what the tutor's question means: the AI clarifies it without answering. */
  tutor_question?: string;
}

export function askLesson(request: AskLessonRequest) {
  return call<{ prompt_version: string; answer: string; follow_ups: string[] }>('ask-lesson', { ...request });
}

export function generateCourse(topic: string, language: 'he' | 'en') {
  return call<{ prompt_version: string; course: GeneratedCourse }>('generate-course', { topic, language });
}

export type ConnectionResult = 'ok' | 'unreachable' | 'not_found' | 'server_error';

/**
 * Checks a server without spending AI tokens: an intentionally empty request
 * must come back as a 400 validation error from our function.
 */
export async function testConnection(config: AiConfig): Promise<ConnectionResult> {
  try {
    await call('feynman-evaluate', {}, config);
    return 'server_error';
  } catch (e) {
    if (!(e instanceof ApiError)) return 'server_error';
    if (e.code === 'invalid_input') return 'ok';
    if (e.code === 'network') return 'unreachable';
    if (e.status === 404) return 'not_found';
    return 'server_error';
  }
}
