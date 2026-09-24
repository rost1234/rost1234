import { assertEquals, assertRejects, assertThrows } from 'jsr:@std/assert@1';
import { HttpError } from '../_shared/http.ts';
import type { StructuredLlm } from '../_shared/llm.ts';
import type { GeneratedCard } from '../_shared/flashcard-generator.ts';
import {
  type FlashcardRepo,
  generateFlashcards,
  MAX_CARDS_PER_HOUR,
  mapWithConcurrency,
  parseGenerateInput,
} from './service.ts';

const CONCEPT_ID = '22222222-2222-4222-8222-222222222222';
const LONG_TEXT = Array.from({ length: 30 }, (_, i) => `Paragraph ${i}: ${'lorem ipsum '.repeat(30)}`).join('\n\n');

function fakeRepo(overrides: Partial<FlashcardRepo> = {}) {
  const inserted: GeneratedCard[] = [];
  const repo: FlashcardRepo = {
    getConcept: async (id) => ({ id, title: 'Photosynthesis', subjectTitle: 'Biology' }),
    countCardsSince: async () => 0,
    existingQuestions: async () => ['What is chlorophyll?'],
    insertCards: async (_id, cards) => {
      inserted.push(...cards);
      return cards.map((c, i) => ({ id: `card-${i}`, ...c }));
    },
    ...overrides,
  };
  return { repo, inserted };
}

/** Every chunk returns the same cards, so cross-chunk dedupe is exercised. */
const llmReturning = (cards: GeneratedCard[]): StructuredLlm => async (req) => req.parse({ cards });

const noPdf = () => Promise.reject(new Error('unused'));

Deno.test('dedupes against existing cards and across chunks', async () => {
  const { repo, inserted } = fakeRepo();
  const llm = llmReturning([
    { question: 'What is chlorophyll', answer: 'dupe of existing' },
    { question: 'Where does photosynthesis happen?', answer: 'In chloroplasts.' },
    { question: 'WHERE does photosynthesis happen', answer: 'dupe across case' },
  ]);
  const result = await generateFlashcards(
    { repo, llm, extractPdfText: noPdf },
    { conceptId: CONCEPT_ID, maxCards: 20, source: { kind: 'text', text: LONG_TEXT } },
  );
  assertEquals(inserted.map((c) => c.question), ['Where does photosynthesis happen?']);
  assertEquals(result.cards.length, 1);
  assertEquals(result.source_truncated, false);
});

Deno.test('caps total cards at max_cards and at the hourly budget', async () => {
  const many = Array.from({ length: 10 }, (_, i) => ({ question: `Question ${i}?`, answer: `Answer ${i}.` }));

  const a = fakeRepo();
  await generateFlashcards(
    { repo: a.repo, llm: llmReturning(many), extractPdfText: noPdf },
    { conceptId: CONCEPT_ID, maxCards: 4, source: { kind: 'text', text: LONG_TEXT } },
  );
  assertEquals(a.inserted.length, 4);

  const b = fakeRepo({ countCardsSince: async () => MAX_CARDS_PER_HOUR - 2 });
  await generateFlashcards(
    { repo: b.repo, llm: llmReturning(many), extractPdfText: noPdf },
    { conceptId: CONCEPT_ID, maxCards: 20, source: { kind: 'text', text: LONG_TEXT } },
  );
  assertEquals(b.inserted.length, 2);
});

Deno.test('hourly limit exhausted → 429', async () => {
  const { repo } = fakeRepo({ countCardsSince: async () => MAX_CARDS_PER_HOUR });
  const err = await assertRejects(
    () =>
      generateFlashcards(
        { repo, llm: llmReturning([]), extractPdfText: noPdf },
        { conceptId: CONCEPT_ID, maxCards: 5, source: { kind: 'text', text: LONG_TEXT } },
      ),
    HttpError,
  );
  assertEquals(err.status, 429);
});

Deno.test('too little text → 422; unreadable PDF → 422', async () => {
  const { repo } = fakeRepo();
  const short = await assertRejects(
    () =>
      generateFlashcards(
        { repo, llm: llmReturning([]), extractPdfText: noPdf },
        { conceptId: CONCEPT_ID, maxCards: 5, source: { kind: 'text', text: 'tiny' } },
      ),
    HttpError,
  );
  assertEquals(short.code, 'source_too_short');

  const pdf = await assertRejects(
    () =>
      generateFlashcards(
        { repo, llm: llmReturning([]), extractPdfText: () => Promise.reject(new Error('encrypted')) },
        { conceptId: CONCEPT_ID, maxCards: 5, source: { kind: 'pdf', bytes: new Uint8Array([1]) } },
      ),
    HttpError,
  );
  assertEquals(pdf.code, 'unreadable_pdf');
});

Deno.test('parseGenerateInput validation', () => {
  const pdf = btoa('%PDF-1.7 rest');
  assertEquals(parseGenerateInput({ concept_id: CONCEPT_ID, text: 'abc' }).maxCards, 20);
  assertEquals(parseGenerateInput({ concept_id: CONCEPT_ID, pdf_base64: pdf }).source.kind, 'pdf');
  assertThrows(() => parseGenerateInput({ concept_id: CONCEPT_ID }), HttpError, 'exactly one');
  assertThrows(() => parseGenerateInput({ concept_id: CONCEPT_ID, text: 'a', pdf_base64: pdf }), HttpError, 'exactly one');
  assertThrows(() => parseGenerateInput({ concept_id: CONCEPT_ID, pdf_base64: btoa('hello') }), HttpError, 'not a PDF');
  assertThrows(() => parseGenerateInput({ concept_id: CONCEPT_ID, pdf_base64: '***' }), HttpError, 'base64');
  assertThrows(() => parseGenerateInput({ concept_id: CONCEPT_ID, text: 'a', max_cards: 51 }), HttpError, 'max_cards');
});

Deno.test('mapWithConcurrency preserves order and limits parallelism', async () => {
  let active = 0;
  let peak = 0;
  const out = await mapWithConcurrency([5, 1, 3, 2, 4], 2, async (n) => {
    peak = Math.max(peak, ++active);
    await new Promise((r) => setTimeout(r, n));
    active--;
    return n * 10;
  });
  assertEquals(out, [50, 10, 30, 20, 40]);
  assertEquals(peak, 2);
});
