import { assertEquals, assertRejects, assertStringIncludes, assertThrows } from 'jsr:@std/assert@1';
import { HttpError } from '../_shared/http.ts';
import type { StructuredLlm } from '../_shared/llm.ts';
import { parseAnswer } from '../_shared/lesson-qa.ts';
import { answerQuestion, parseAskInput } from './service.ts';

Deno.test('parseAskInput defaults, trims history and validates', () => {
  const history = Array.from({ length: 9 }, (_, i) => ({ question: `q${i}`, answer: `a${i}` }));
  const input = parseAskInput({ concept_title: ' Entropy ', question: ' why? ', history: [...history, { question: 1 }] });
  assertEquals(input.conceptTitle, 'Entropy');
  assertEquals(input.question, 'why?');
  assertEquals(input.language, 'Hebrew');
  assertEquals(input.history.length, 6);
  assertEquals(input.history[5]!.question, 'q8');
  assertThrows(() => parseAskInput({ concept_title: 'x' }), HttpError, 'question');
  assertThrows(() => parseAskInput({ concept_title: 'x', question: 'why?', level: 'phd' }), HttpError, 'level');
  assertThrows(() => parseAskInput({ concept_title: 'x', question: 'why?', history: 'no' }), HttpError, 'history');
});

Deno.test('parseAnswer caps follow-ups and rejects empty answers', () => {
  const a = parseAnswer({ answer: ' Because heat flows from hot to cold. ', follow_ups: ['a', '', 'b', 'c', 'd'] });
  assertEquals(a.answer, 'Because heat flows from hot to cold.');
  assertEquals(a.follow_ups, ['a', 'b', 'c']);
  assertThrows(() => parseAnswer({ answer: '', follow_ups: [] }));
});

Deno.test('answerQuestion sends the lesson, level, history and question', async () => {
  let user = '';
  const llm: StructuredLlm = async (req) => {
    user = req.user;
    return req.parse({ answer: 'Entropy measures how many microstates fit a macrostate.', follow_ups: ['What is a microstate?'] });
  };
  const result = await answerQuestion(
    llm,
    parseAskInput({ concept_title: 'Entropy', level: 'bachelor', lesson: 'Lesson text', history: [{ question: 'Q0', answer: 'A0' }], question: 'Why?' }),
  );
  assertEquals(result.follow_ups, ['What is a microstate?']);
  assertStringIncludes(result.prompt_version, 'lesson-qa@');
  assertStringIncludes(user, "LEVEL: bachelor's degree");
  assertStringIncludes(user, '<lesson>\nLesson text\n</lesson>');
  assertStringIncludes(user, 'Q: Q0\nA: A0');
  assertStringIncludes(user, '<question>\nWhy?\n</question>');
});

Deno.test('answerQuestion surfaces LLM failures', async () => {
  const llm: StructuredLlm = () => Promise.reject(new HttpError(502, 'down', 'llm_error'));
  await assertRejects(() => answerQuestion(llm, parseAskInput({ concept_title: 'x', question: 'why?' })), HttpError);
});
