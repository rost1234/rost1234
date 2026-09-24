import { assertEquals, assertRejects, assertStringIncludes, assertThrows } from 'jsr:@std/assert@1';
import { HttpError } from '../_shared/http.ts';
import { LlmError, type StructuredLlm } from '../_shared/llm.ts';
import type { FeynmanEvaluation } from '../_shared/feynman-tutor.ts';
import { evaluateExplanation, type FeynmanRepo, MAX_SESSIONS_PER_HOUR, parseEvaluateInput } from './service.ts';

const CONCEPT_ID = '11111111-1111-4111-8111-111111111111';
const EXPLANATION = 'Things float because the water pushes them up harder than gravity pulls.';

function fakeRepo(overrides: Partial<FeynmanRepo> = {}) {
  const log: string[] = [];
  let saved: FeynmanEvaluation | null = null;
  const repo: FeynmanRepo = {
    getConcept: async (id) => ({ id, title: 'Buoyancy', subjectTitle: 'Physics' }),
    countSessionsSince: async () => 0,
    previousQuestions: async () => ['What pushes up?'],
    referenceCards: async () => [{ question: 'What is buoyancy?', answer: 'Upward force from a fluid.' }],
    createSession: async () => {
      log.push('create');
      return 'session-1';
    },
    saveEvaluation: async (_id, ev) => {
      log.push('save');
      saved = ev;
    },
    deleteSession: async () => {
      log.push('delete');
    },
    ...overrides,
  };
  return { repo, log, saved: () => saved };
}

const modelOutput = {
  comprehension_score: 55,
  mastery_verdict: 'solid', // wrong on purpose — must be re-derived from the score
  jargon_detected: [],
  misconceptions: [],
  primary_gap: 'what determines how hard the water pushes',
  socratic_question: 'Why would a steel ship float while a steel ball sinks?',
  encouragement: 'Good instinct about opposing forces.',
};

Deno.test('happy path: creates, scores and saves the session', async () => {
  const { repo, log, saved } = fakeRepo();
  let userMessage = '';
  const llm: StructuredLlm = async (req) => {
    userMessage = req.user;
    return req.parse(modelOutput);
  };
  const result = await evaluateExplanation({ repo, llm }, { conceptId: CONCEPT_ID, explanation: EXPLANATION });

  assertEquals(log, ['create', 'save']);
  assertEquals(result.session_id, 'session-1');
  assertEquals(result.evaluation.mastery_verdict, 'developing');
  assertEquals(saved()?.comprehension_score, 55);
  assertStringIncludes(userMessage, 'Q: What is buoyancy?');
  assertStringIncludes(userMessage, '- What pushes up?');
  assertStringIncludes(userMessage, `<learner_explanation>\n${EXPLANATION}\n</learner_explanation>`);
});

Deno.test('unknown or foreign concept → 404, nothing written', async () => {
  const { repo, log } = fakeRepo({ getConcept: async () => null });
  const llm: StructuredLlm = () => Promise.reject(new Error('should not be called'));
  const err = await assertRejects(
    () => evaluateExplanation({ repo, llm }, { conceptId: CONCEPT_ID, explanation: EXPLANATION }),
    HttpError,
  );
  assertEquals(err.status, 404);
  assertEquals(log, []);
});

Deno.test('rate limit → 429 before calling the model', async () => {
  const { repo, log } = fakeRepo({ countSessionsSince: async () => MAX_SESSIONS_PER_HOUR });
  const llm: StructuredLlm = () => Promise.reject(new Error('should not be called'));
  const err = await assertRejects(
    () => evaluateExplanation({ repo, llm }, { conceptId: CONCEPT_ID, explanation: EXPLANATION }),
    HttpError,
  );
  assertEquals(err.status, 429);
  assertEquals(log, []);
});

Deno.test('model failure deletes the unscored session and propagates 502', async () => {
  const { repo, log } = fakeRepo();
  const llm: StructuredLlm = () => Promise.reject(new LlmError('down'));
  const err = await assertRejects(
    () => evaluateExplanation({ repo, llm }, { conceptId: CONCEPT_ID, explanation: EXPLANATION }),
    LlmError,
  );
  assertEquals(err.status, 502);
  assertEquals(log, ['create', 'delete']);
});

Deno.test('input validation', () => {
  assertEquals(parseEvaluateInput({ concept_id: CONCEPT_ID, explanation: `  ${EXPLANATION}  ` }).explanation, EXPLANATION);
  assertThrows(() => parseEvaluateInput({ concept_id: 'nope', explanation: EXPLANATION }), HttpError, 'UUID');
  assertThrows(() => parseEvaluateInput({ concept_id: CONCEPT_ID, explanation: 'too short' }), HttpError, 'at least');
  assertThrows(() => parseEvaluateInput({ concept_id: CONCEPT_ID, explanation: 'x'.repeat(8001) }), HttpError, 'at most');
});
