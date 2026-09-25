import { assertEquals, assertRejects, assertStringIncludes, assertThrows } from 'jsr:@std/assert@1';
import { HttpError } from '../_shared/http.ts';
import type { StructuredLlm } from '../_shared/llm.ts';
import { parseLesson } from '../_shared/lesson-writer.ts';
import { parseLessonInput, writeLesson } from './service.ts';

const explanation = 'A lesson paragraph that is long enough to count as a real explanation of the idea. '.repeat(2);

Deno.test('parseLessonInput defaults and validation', () => {
  const input = parseLessonInput({ concept_title: ' Entropy ', previous_titles: ['Heat', 2] });
  assertEquals(input.level, 'standalone');
  assertEquals(input.language, 'Hebrew');
  assertEquals(input.conceptTitle, 'Entropy');
  assertEquals(input.previousTitles, ['Heat']);
  assertThrows(() => parseLessonInput({ concept_title: 'x', level: 'phd' }), HttpError, 'level');
  assertThrows(() => parseLessonInput({ level: 'master' }), HttpError, 'concept_title');
});

Deno.test('parseLesson keeps valid cards and rejects thin lessons', () => {
  const lesson = parseLesson({ explanation, cards: [{ question: 'Q1?', answer: 'A' }, { question: '', answer: 'x' }, { question: 'Q2?', answer: 'B' }] });
  assertEquals(lesson.cards.length, 2);
  assertThrows(() => parseLesson({ explanation: 'short', cards: [] }));
  assertEquals(parseLesson({ explanation: '', cards: [] }).cards, []);
});

Deno.test('writeLesson pitches the prompt at the level and passes context', async () => {
  let system = '';
  let user = '';
  const llm: StructuredLlm = async (req) => {
    system = req.system;
    user = req.user;
    return req.parse({ explanation, cards: [{ question: 'Q1?', answer: 'A' }, { question: 'Q2?', answer: 'B' }] });
  };
  await writeLesson(llm, parseLessonInput({ concept_title: 'Noether', level: 'master', course_title: 'Physics', previous_titles: ['Lagrangian'] }));
  assertStringIncludes(system, "master's student");
  assertStringIncludes(user, 'COURSE: Physics');
  assertStringIncludes(user, '- Lagrangian');
  assertStringIncludes(user, '<concept>\nNoether\n</concept>');
});

Deno.test('an unteachable concept becomes 422', async () => {
  const llm: StructuredLlm = async (req) => req.parse({ explanation: '', cards: [] });
  const err = await assertRejects(() => writeLesson(llm, parseLessonInput({ concept_title: 'asdfgh' })), HttpError);
  assertEquals(err.code, 'invalid_topic');
});
