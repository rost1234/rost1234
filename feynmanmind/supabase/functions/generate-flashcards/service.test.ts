import { assertEquals, assertRejects, assertThrows } from 'jsr:@std/assert@1';
import { HttpError } from '../_shared/http.ts';
import type { StructuredLlm } from '../_shared/llm.ts';
import type { GeneratedCard } from '../_shared/flashcard-generator.ts';
import { generateFlashcards, mapWithConcurrency, parseGenerateInput, type GenerateInput } from './service.ts';

const LONG_TEXT = Array.from({ length: 30 }, (_, i) => `Paragraph ${i}: ${'lorem ipsum '.repeat(30)}`).join('\n\n');
const base = { subjectTitle: 'Biology', conceptTitle: 'Photosynthesis', existingQuestions: ['What is chlorophyll?'] };
const input = (over: Partial<GenerateInput> = {}): GenerateInput => ({ ...base, maxCards: 20, source: { kind: 'text', text: LONG_TEXT }, ...over });

/** Every chunk returns the same cards, so cross-chunk dedupe is exercised. */
const llmReturning = (cards: GeneratedCard[]): StructuredLlm => async (req) => req.parse({ cards });
const noPdf = () => Promise.reject(new Error('unused'));

Deno.test('dedupes against existing cards and across chunks', async () => {
  const llm = llmReturning([
    { question: 'What is chlorophyll', answer: 'dupe of existing' },
    { question: 'Where does photosynthesis happen?', answer: 'In chloroplasts.' },
    { question: 'WHERE does photosynthesis happen', answer: 'dupe across case' },
  ]);
  const result = await generateFlashcards({ llm, extractPdfText: noPdf }, input());
  assertEquals(result.cards.map((c) => c.question), ['Where does photosynthesis happen?']);
  assertEquals(result.source_truncated, false);
});

Deno.test('caps total cards at max_cards', async () => {
  const many = Array.from({ length: 10 }, (_, i) => ({ question: `Question ${i}?`, answer: `Answer ${i}.` }));
  const result = await generateFlashcards({ llm: llmReturning(many), extractPdfText: noPdf }, input({ maxCards: 4 }));
  assertEquals(result.cards.length, 4);
});

Deno.test('too little text → 422; unreadable PDF → 422', async () => {
  const short = await assertRejects(
    () => generateFlashcards({ llm: llmReturning([]), extractPdfText: noPdf }, input({ source: { kind: 'text', text: 'tiny' } })),
    HttpError,
  );
  assertEquals(short.code, 'source_too_short');
  const pdf = await assertRejects(
    () =>
      generateFlashcards(
        { llm: llmReturning([]), extractPdfText: () => Promise.reject(new Error('encrypted')) },
        input({ source: { kind: 'pdf', bytes: new Uint8Array([1]) } }),
      ),
    HttpError,
  );
  assertEquals(pdf.code, 'unreadable_pdf');
});

Deno.test('parseGenerateInput validation', () => {
  const b = { subject_title: 'Biology', concept_title: 'Photosynthesis' };
  const pdf = btoa('%PDF-1.7 rest');
  assertEquals(parseGenerateInput({ ...b, text: 'abc' }).maxCards, 20);
  assertEquals(parseGenerateInput({ ...b, text: 'abc', existing_questions: ['Q?', 3] }).existingQuestions, ['Q?']);
  assertEquals(parseGenerateInput({ ...b, pdf_base64: pdf }).source.kind, 'pdf');
  assertThrows(() => parseGenerateInput({ ...b }), HttpError, 'exactly one');
  assertThrows(() => parseGenerateInput({ ...b, text: 'a', pdf_base64: pdf }), HttpError, 'exactly one');
  assertThrows(() => parseGenerateInput({ ...b, pdf_base64: btoa('hello') }), HttpError, 'not a PDF');
  assertThrows(() => parseGenerateInput({ ...b, pdf_base64: '***' }), HttpError, 'base64');
  assertThrows(() => parseGenerateInput({ ...b, text: 'a', max_cards: 51 }), HttpError, 'max_cards');
  assertThrows(() => parseGenerateInput({ text: 'a' }), HttpError, 'subject_title');
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
