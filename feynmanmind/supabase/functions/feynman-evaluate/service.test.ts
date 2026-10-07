import { assertEquals, assertRejects, assertStringIncludes, assertThrows } from 'jsr:@std/assert@1';
import { HttpError } from '../_shared/http.ts';
import { LlmError, type StructuredLlm } from '../_shared/llm.ts';
import { evaluateExplanation, parseEvaluateInput } from './service.ts';

const EXPLANATION = 'Things float because the water pushes them up harder than gravity pulls.';
const body = {
  subject_title: 'Physics',
  concept_title: 'Buoyancy',
  explanation: `  ${EXPLANATION}  `,
  previous_questions: ['What pushes up?'],
  reference_text: 'Buoyancy is the upward push of a fluid.',
  reference_cards: [{ question: 'What is buoyancy?', answer: 'Upward force from a fluid.' }, { question: 'broken' }, null],
};

const modelOutput = {
  comprehension_score: 55,
  mastery_verdict: 'solid', // wrong on purpose — re-derived from the score
  jargon_detected: [],
  misconceptions: [],
  primary_gap: 'what determines how hard the water pushes',
  socratic_question: 'Why would a steel ship float while a steel ball sinks?',
  encouragement: 'Good instinct about opposing forces.',
};

Deno.test('parses input and drops malformed reference cards', () => {
  const input = parseEvaluateInput(body);
  assertEquals(input.explanation, EXPLANATION);
  assertEquals(input.referenceCards, [{ question: 'What is buoyancy?', answer: 'Upward force from a fluid.' }]);
  assertEquals(input.previousQuestions, ['What pushes up?']);
});

Deno.test('input validation', () => {
  assertThrows(() => parseEvaluateInput({ ...body, concept_title: '' }), HttpError, 'concept_title');
  assertThrows(() => parseEvaluateInput({ ...body, explanation: 'too short' }), HttpError, 'at least');
  assertThrows(() => parseEvaluateInput({ ...body, explanation: 'x'.repeat(8001) }), HttpError, 'at most');
  assertThrows(() => parseEvaluateInput({ ...body, reference_cards: 'nope' }), HttpError, 'array');
});

Deno.test('sends full context to the tutor and normalises the result', async () => {
  let userMessage = '';
  const llm: StructuredLlm = async (req) => {
    userMessage = req.user;
    return req.parse(modelOutput);
  };
  const result = await evaluateExplanation(llm, parseEvaluateInput(body));
  assertEquals(result.evaluation.mastery_verdict, 'developing');
  assertEquals(result.evaluation.comprehension_score, 55);
  assertStringIncludes(userMessage, 'CONCEPT: Buoyancy');
  assertStringIncludes(userMessage, 'Q: What is buoyancy?');
  assertStringIncludes(userMessage, 'Buoyancy is the upward push of a fluid.');
  assertStringIncludes(userMessage, '- What pushes up?');
  assertStringIncludes(userMessage, `<learner_message>\n${EXPLANATION}\n</learner_message>`);
  assertStringIncludes(userMessage, 'LANGUAGE: Hebrew');
  // Old model output without the new fields still works.
  assertEquals(result.evaluation.next_step, 'answer_question');
  assertEquals(result.evaluation.feedback, 'Good instinct about opposing forces.');
});

Deno.test('model failure propagates as 502', async () => {
  const llm: StructuredLlm = () => Promise.reject(new LlmError('down'));
  const err = await assertRejects(() => evaluateExplanation(llm, parseEvaluateInput(body)), LlmError);
  assertEquals(err.status, 502);
});

Deno.test('a reply in a conversation: short answers allowed, turns and language sent', async () => {
  const conversation = [
    { role: 'learner', text: EXPLANATION },
    { role: 'tutor', text: 'Why would a steel ship float while a steel ball sinks?' },
    { role: 'robot', text: 'dropped' },
  ];
  const input = parseEvaluateInput({ ...body, explanation: 'Shape', conversation, language: 'en' });
  assertEquals(input.conversation.length, 2);
  assertEquals(input.language, 'English');
  assertThrows(() => parseEvaluateInput({ ...body, explanation: 'x', conversation }), HttpError, 'at least');
  assertThrows(() => parseEvaluateInput({ ...body, conversation: 'no' }), HttpError, 'array');
  assertThrows(() => parseEvaluateInput({ ...body, language: 'fr' }), HttpError, 'language');

  let userMessage = '';
  const llm: StructuredLlm = async (req) => {
    userMessage = req.user;
    return req.parse({ ...modelOutput, feedback: 'Closer.', next_step: 'refine_explanation', refine_quote: '"the water pushes them up"' });
  };
  const result = await evaluateExplanation(llm, input);
  assertStringIncludes(userMessage, `LEARNER: ${EXPLANATION}`);
  assertStringIncludes(userMessage, 'TUTOR: Why would a steel ship');
  assertStringIncludes(userMessage, 'LANGUAGE: English');
  assertEquals(result.evaluation.next_step, 'refine_explanation');
  assertEquals(result.evaluation.refine_quote, 'the water pushes them up');
  assertEquals(result.evaluation.feedback, 'Closer.');
});

Deno.test('a refine quote the learner never wrote is dropped; no quote means answer the question', async () => {
  const run = (extra: Record<string, unknown>) =>
    evaluateExplanation(async (req) => req.parse({ ...modelOutput, feedback: 'x', ...extra }), parseEvaluateInput(body));
  assertEquals((await run({ next_step: 'refine_explanation', refine_quote: 'words never written' })).evaluation.refine_quote, '');
  assertEquals((await run({ next_step: 'refine_explanation', refine_quote: '' })).evaluation.next_step, 'answer_question');
  assertEquals((await run({ next_step: 'bogus', refine_quote: '' })).evaluation.next_step, 'answer_question');
  assertEquals((await run({ next_step: 'done', refine_quote: '' })).evaluation.next_step, 'done');
});
