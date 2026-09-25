import { HttpError, requireText, stringList } from '../_shared/http.ts';
import type { StructuredLlm } from '../_shared/llm.ts';
import {
  buildFlashcardUserMessage,
  chunkText,
  FLASHCARD_PROMPT_VERSION,
  FLASHCARD_RESPONSE_SCHEMA,
  FLASHCARD_SYSTEM_PROMPT,
  type GeneratedCard,
  normalizeText,
  parseFlashcards,
  questionKey,
} from '../_shared/flashcard-generator.ts';

export const MIN_SOURCE_CHARS = 200;
/** ~15k tokens of source per request keeps cost and latency bounded. */
export const MAX_SOURCE_CHARS = 60_000;
export const DEFAULT_MAX_CARDS = 20;
export const MAX_CARDS_LIMIT = 50;
const CHUNK_CHARS = 6000;
const LLM_CONCURRENCY = 3;
const MAX_PDF_BYTES = 10 * 1024 * 1024;

export type SourceInput = { kind: 'text'; text: string } | { kind: 'pdf'; bytes: Uint8Array };

export interface GenerateInput {
  subjectTitle: string;
  conceptTitle: string;
  source: SourceInput;
  maxCards: number;
  /** Questions the learner already has for this concept (stored on their device). */
  existingQuestions: string[];
}

export interface GenerateResult {
  prompt_version: string;
  cards: GeneratedCard[];
  chunks_processed: number;
  source_truncated: boolean;
}

export function parseGenerateInput(body: Record<string, unknown>): GenerateInput {
  const subjectTitle = requireText(body.subject_title, 'subject_title', 1, 200);
  const conceptTitle = requireText(body.concept_title, 'concept_title', 1, 200);
  const existingQuestions = stringList(body.existing_questions, 'existing_questions', 500, 1000);

  let maxCards = DEFAULT_MAX_CARDS;
  if (body.max_cards !== undefined) {
    if (!Number.isInteger(body.max_cards) || (body.max_cards as number) < 1 || (body.max_cards as number) > MAX_CARDS_LIMIT) {
      throw new HttpError(400, `max_cards must be an integer 1–${MAX_CARDS_LIMIT}`, 'invalid_input');
    }
    maxCards = body.max_cards as number;
  }

  const hasText = typeof body.text === 'string';
  const hasPdf = typeof body.pdf_base64 === 'string';
  if (hasText === hasPdf) {
    throw new HttpError(400, 'Provide exactly one of text or pdf_base64', 'invalid_input');
  }
  const base = { subjectTitle, conceptTitle, maxCards, existingQuestions };
  if (hasText) return { ...base, source: { kind: 'text', text: body.text as string } };

  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(body.pdf_base64 as string), (c) => c.charCodeAt(0));
  } catch {
    throw new HttpError(400, 'pdf_base64 is not valid base64', 'invalid_input');
  }
  if (bytes.byteLength > MAX_PDF_BYTES) throw new HttpError(413, 'PDF is larger than 10 MB', 'payload_too_large');
  // "%PDF-" magic header
  if (!(bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)) {
    throw new HttpError(400, 'pdf_base64 is not a PDF', 'invalid_input');
  }
  return { ...base, source: { kind: 'pdf', bytes } };
}

export async function generateFlashcards(
  deps: { llm: StructuredLlm; extractPdfText: (bytes: Uint8Array) => Promise<string> },
  input: GenerateInput,
): Promise<GenerateResult> {
  const { llm } = deps;
  const raw = input.source.kind === 'text' ? input.source.text : await extractPdf(deps.extractPdfText, input.source.bytes);
  const text = normalizeText(raw);
  if (text.length < MIN_SOURCE_CHARS) {
    throw new HttpError(422, `Not enough readable text (need at least ${MIN_SOURCE_CHARS} characters)`, 'source_too_short');
  }
  const truncated = text.length > MAX_SOURCE_CHARS;
  const chunks = chunkText(text.slice(0, MAX_SOURCE_CHARS), CHUNK_CHARS, Math.ceil(MAX_SOURCE_CHARS / CHUNK_CHARS));
  const perChunk = Math.min(input.maxCards, Math.ceil(input.maxCards / chunks.length) + 2);

  const results = await mapWithConcurrency(chunks, LLM_CONCURRENCY, (chunk) =>
    llm({
      name: 'flashcards',
      system: FLASHCARD_SYSTEM_PROMPT,
      user: buildFlashcardUserMessage({
        subjectTitle: input.subjectTitle,
        conceptTitle: input.conceptTitle,
        maxCards: perChunk,
        existingQuestions: input.existingQuestions,
        chunk,
      }),
      schema: FLASHCARD_RESPONSE_SCHEMA,
      parse: parseFlashcards,
      temperature: 0.2,
      maxOutputTokens: 3000,
    }),
  );

  // Dedupe against the learner's existing cards and across chunks, keeping source order.
  const seen = new Set(input.existingQuestions.map(questionKey));
  const cards: GeneratedCard[] = [];
  for (const card of results.flat()) {
    const key = questionKey(card.question);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    cards.push(card);
    if (cards.length >= input.maxCards) break;
  }

  return { prompt_version: FLASHCARD_PROMPT_VERSION, cards, chunks_processed: chunks.length, source_truncated: truncated };
}

async function extractPdf(extract: (b: Uint8Array) => Promise<string>, bytes: Uint8Array): Promise<string> {
  try {
    return await extract(bytes);
  } catch (err) {
    console.warn('[flashcards] pdf extraction failed', (err as Error).message);
    throw new HttpError(422, 'Could not read text from this PDF (is it scanned or encrypted?)', 'unreadable_pdf');
  }
}

export async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}
