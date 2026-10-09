import { assertEquals, assertRejects, assertStringIncludes, assertThrows } from 'jsr:@std/assert@1';
import { HttpError } from '../_shared/http.ts';
import type { StructuredLlm } from '../_shared/llm.ts';
import { parseLesson, shuffleOptions } from '../_shared/lesson-writer.ts';
import { parseLessonInput, writeLesson } from './service.ts';

const body = 'A paragraph that is long enough to count as a real explanation of the idea. '.repeat(3);
const check = (n: number) => ({ question: `Check ${n}?`, options: ['right', 'wrong a', 'wrong b', 'wrong c'], correct: 0, why: 'Because.' });
const cards = [{ question: 'Q1?', answer: 'A' }, { question: '', answer: 'x' }, { question: 'Q2?', answer: 'B' }];
const full = {
  hook: 'Why does a ship float?',
  sections: [{ heading: 'The idea', body }, { heading: 'Why it works', body }, { heading: '', body: 'dropped' }],
  example: { title: 'Example: a boat', body: 'A 10 kg boat displaces 10 litres.' },
  misconception: { myth: 'Many think heavy things sink.', truth: 'Density decides.' },
  connection: 'Builds on pressure.',
  check: [check(1), check(2), { ...check(3), options: ['same', 'same', 'x', 'y'] }],
  cards,
};
const empty = { hook: '', sections: [], example: { title: '', body: '' }, misconception: { myth: '', truth: '' }, connection: '', check: [], cards: [] };

Deno.test('parseLessonInput defaults and validation', () => {
  const input = parseLessonInput({ concept_title: ' Entropy ', previous_titles: ['Heat', 2] });
  assertEquals(input.level, 'standalone');
  assertEquals(input.language, 'Hebrew');
  assertEquals(input.conceptTitle, 'Entropy');
  assertEquals(input.previousTitles, ['Heat']);
  assertThrows(() => parseLessonInput({ concept_title: 'x', level: 'phd' }), HttpError, 'level');
  assertThrows(() => parseLessonInput({ level: 'master' }), HttpError, 'concept_title');
});

Deno.test('parseLesson builds the structured lesson, its plain text, and rejects thin ones', () => {
  const lesson = parseLesson(full, () => 0.99);
  assertEquals(lesson.cards.length, 2);
  assertEquals(lesson.parts!.sections.length, 2);
  // The invalid check question is dropped; options are shuffled and `correct` follows the right answer.
  assertEquals(lesson.parts!.check.length, 2);
  for (const q of lesson.parts!.check) assertEquals(q.options[q.correct], 'right');
  assertStringIncludes(lesson.explanation, 'Why does a ship float?');
  assertStringIncludes(lesson.explanation, 'The idea\n');
  assertStringIncludes(lesson.explanation, 'Density decides.');
  assertThrows(() => parseLesson({ ...full, sections: full.sections.slice(0, 1) }), Error, 'too thin');
  assertThrows(() => parseLesson({ ...full, check: [check(1)] }), Error, 'too thin');
  assertEquals(parseLesson(empty).cards, []);
});

Deno.test('shuffleOptions keeps the right answer marked', () => {
  for (const r of [0, 0.3, 0.6, 0.99]) {
    const q = shuffleOptions({ options: ['a', 'b', 'c', 'd'], correct: 2 }, () => r);
    assertEquals(q.options[q.correct], 'c');
  }
});

Deno.test('writeLesson pitches the prompt at the level and passes context', async () => {
  let system = '';
  let user = '';
  const llm: StructuredLlm = async (req) => {
    system = req.system;
    user = req.user;
    return req.parse(full);
  };
  await writeLesson(llm, parseLessonInput({ concept_title: 'Noether', level: 'master', course_title: 'Physics', unit: 'Classical Mechanics II', previous_titles: ['Lagrangian'] }));
  assertStringIncludes(system, "master's student");
  assertStringIncludes(user, 'COURSE: Physics');
  assertStringIncludes(user, 'UNIT: Classical Mechanics II');
  assertStringIncludes(user, '- Lagrangian');
  assertStringIncludes(user, '<concept>\nNoether\n</concept>');
});

Deno.test('an unteachable concept becomes 422', async () => {
  const llm: StructuredLlm = async (req) => req.parse(empty);
  const err = await assertRejects(() => writeLesson(llm, parseLessonInput({ concept_title: 'asdfgh' })), HttpError);
  assertEquals(err.code, 'invalid_topic');
});
