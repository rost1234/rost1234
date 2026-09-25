import { assertEquals, assertRejects, assertStringIncludes, assertThrows } from 'jsr:@std/assert@1';
import { HttpError } from '../_shared/http.ts';
import type { StructuredLlm } from '../_shared/llm.ts';
import { parseCourse } from '../_shared/course-generator.ts';
import { generateCourse, parseCourseInput } from './service.ts';

const quiz = [{ question: 'Q?', options: ['right', 'wrong', 'also wrong', 'no'], correct: 0 }];
const level = (key: string, titles: string[]) => ({ key, stations: titles.map((t) => ({ title: t, summary: `About ${t}` })), quiz });
const plan = {
  course_title: ' Astronomy ',
  course_description: 'Stars and beyond',
  levels: [
    level('foundations', ['Stars', 'Planets', 'stars']),
    level('advanced', ['Orbits']),
    level('bachelor', ['Stellar evolution']),
    level('master', ['Cosmology']),
  ],
};

Deno.test('parseCourse keeps level order, keys stations per level and dedupes titles', () => {
  const course = parseCourse({ ...plan, levels: [...plan.levels].reverse() });
  assertEquals(course.title, 'Astronomy');
  assertEquals(course.levels.map((l) => l.key), ['foundations', 'advanced', 'bachelor', 'master']);
  assertEquals(course.levels[0]!.stations.map((s) => [s.key, s.title]), [['f1', 'Stars'], ['f2', 'Planets']]);
  assertEquals(course.levels[3]!.stations[0]!.key, 'm1');
});

Deno.test('parseCourse drops broken quiz questions', () => {
  const bad = { question: 'Bad', options: ['only one'], correct: 0 };
  const outOfRange = { question: 'Bad', options: ['a', 'b'], correct: 5 };
  const course = parseCourse({ ...plan, levels: plan.levels.map((l) => ({ ...l, quiz: [...quiz, bad, outOfRange] })) });
  assertEquals(course.levels[0]!.quiz.length, 1);
});

Deno.test('parseCourse rejects thin plans but passes the refusal marker', () => {
  assertThrows(() => parseCourse({ ...plan, levels: plan.levels.slice(0, 2) }));
  assertEquals(parseCourse({ course_title: '?', course_description: '', levels: [] }).levels, []);
});

Deno.test('parseCourseInput validates topic and language', () => {
  assertEquals(parseCourseInput({ topic: ' Astronomy ' }), { topic: 'Astronomy', language: 'Hebrew' });
  assertThrows(() => parseCourseInput({ topic: 'x' }), HttpError, 'topic');
  assertThrows(() => parseCourseInput({ topic: 'Astronomy', language: 'fr' }), HttpError, 'language');
});

Deno.test('generateCourse sends topic and language; a non-topic becomes 422', async () => {
  let user = '';
  const llm: StructuredLlm = async (req) => {
    user = req.user;
    return req.parse(plan);
  };
  const result = await generateCourse(llm, { topic: 'Astronomy', language: 'Hebrew' });
  assertEquals(result.course.levels.length, 4);
  assertStringIncludes(user, 'LANGUAGE: Hebrew');

  const refusing: StructuredLlm = async (req) => req.parse({ course_title: '?', course_description: '', levels: [] });
  const err = await assertRejects(() => generateCourse(refusing, { topic: 'asdf', language: 'Hebrew' }), HttpError);
  assertEquals(err.code, 'invalid_topic');
});
