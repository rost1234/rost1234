import { HttpError, requireUuid } from '../_shared/http.ts';
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
export const MAX_CARDS_PER_HOUR = 300;
const CHUNK_CHARS = 6000;
const LLM_CONCURRENCY = 3;

export interface ConceptInfo {
  id: string;
  title: string;
  subjectTitle: string;
}

export interface InsertedCard {
  id: string;
  question: string;
  answer: string;
}

export interface FlashcardRepo {
  getConcept(conceptId: string): Promise<ConceptInfo | null>;
  /** The caller's cards, across all concepts, created since `since`. */
  countCardsSince(since: Date): Promise<number>;
  existingQuestions(conceptId: string): Promise<string[]>;
  /** Inserts, silently skipping (concept_id, question) duplicates. */
  insertCards(conceptId: string, cards: GeneratedCard[]): Promise<InsertedCard[]>;
}

export type SourceInput = { kind: 'text'; text: string } | { kind: 'pdf'; bytes: Uint8Array };

export interface GenerateInput {
  conceptId: string;
  source: SourceInput;
  maxCards: number;
}

export interface GenerateResult {
  prompt_version: string;
  cards: InsertedCard[];
  chunks_processed: number;
  source_truncated: boolean;
}

const MAX_PDF_BYTES = 10 * 1024 * 1024;

export function parseGenerateInput(body: Record<string, unknown>): GenerateInput {
  const conceptId = requireUuid(body.concept_id, 'concept_id');

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
  if (hasText) return { conceptId, maxCards, source: { kind: 'text', text: body.text as string } };

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
  return { conceptId, maxCards, source: { kind: 'pdf', bytes } };
}

export async function generateFlashcards(
  deps: {
    repo: FlashcardRepo;
    llm: StructuredLlm;
    extractPdfText: (bytes: Uint8Array) => Promise<string>;
    now?: () => Date;
  },
  input: GenerateInput,
): Promise<GenerateResult> {
  const { repo, llm } = deps;
  const now = deps.now?.() ?? new Date();

  const concept = await repo.getConcept(input.conceptId);
  if (!concept) throw new HttpError(404, 'Concept not found', 'not_found');

  const recent = await repo.countCardsSince(new Date(now.getTime() - 60 * 60 * 1000));
  const budget = Math.min(input.maxCards, MAX_CARDS_PER_HOUR - recent);
  if (budget <= 0) throw new HttpError(429, 'Hourly flashcard limit reached, try again later', 'rate_limited');

  const raw = input.source.kind === 'text' ? input.source.text : await extractPdf(deps.extractPdfText, input.source.bytes);
  const text = normalizeText(raw);
  if (text.length < MIN_SOURCE_CHARS) {
    throw new HttpError(422, `Not enough readable text (need at least ${MIN_SOURCE_CHARS} characters)`, 'source_too_short');
  }
  const truncated = text.length > MAX_SOURCE_CHARS;
  const chunks = chunkText(text.slice(0, MAX_SOURCE_CHARS), CHUNK_CHARS, Math.ceil(MAX_SOURCE_CHARS / CHUNK_CHARS));

  const existingQuestions = await repo.existingQuestions(concept.id);
  const perChunk = Math.min(budget, Math.ceil(budget / chunks.length) + 2);

  const results = await mapWithConcurrency(chunks, LLM_CONCURRENCY, (chunk) =>
    llm({
      name: 'flashcards',
      system: FLASHCARD_SYSTEM_PROMPT,
      user: buildFlashcardUserMessage({
        subjectTitle: concept.subjectTitle,
        conceptTitle: concept.title,
        maxCards: perChunk,
        existingQuestions,
        chunk,
      }),
      schema: FLASHCARD_RESPONSE_SCHEMA,
      parse: parseFlashcards,
      temperature: 0.2,
      maxOutputTokens: 3000,
    }),
  );

  // Dedupe against existing cards and across chunks, keeping source order.
  const seen = new Set(existingQuestions.map(questionKey));
  const selected: GeneratedCard[] = [];
  for (const card of results.flat()) {
    const key = questionKey(card.question);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    selected.push(card);
    if (selected.length >= budget) break;
  }

  const cards = selected.length ? await repo.insertCards(concept.id, selected) : [];
  return {
    prompt_version: FLASHCARD_PROMPT_VERSION,
    cards,
    chunks_processed: chunks.length,
    source_truncated: truncated,
  };
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
