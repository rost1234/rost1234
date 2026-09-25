import { assertEquals, assertRejects, assertStringIncludes, assertThrows } from 'jsr:@std/assert@1';
import { HttpError } from '../_shared/http.ts';
import type { StructuredLlm } from '../_shared/llm.ts';
import { parseCourse } from '../_shared/course-generator.ts';
import { generateCourse, parseCourseInput } from './service.ts';

const explanation = 'An explanation that is long enough to be a real lesson about this concept. '.repeat(3);
const concept = (title: string) => ({
  title,
  summary: `About ${title}`,
  explanation,
  cards: [{ question: `What is ${title}?`, answer: 'It is a thing.' }, { question: '', answer: 'dropped' }],
});

Deno.test('parseCourse keys concepts in order, drops bad items and dedupes titles', () => {
  const course = parseCourse({
    course_title: ' Astronomy ',
    course_description: 'Stars and planets',
    concepts: [concept('Stars'), concept('Planets'), concept('stars'), { title: 'Short', explanation: 'too short', cards: [] }, concept('Galaxies')],
  });
  assertEquals(course.title, 'Astronomy');
  assertEquals(course.concepts.map((c) => [c.key, c.title]), [['c1', 'Stars'], ['c2', 'Planets'], ['c3', 'Galaxies']]);
  assertEquals(course.concepts[0]!.cards.length, 1);
});

Deno.test('parseCourse rejects thin output (so the client retries) but passes the refusal marker', () => {
  assertThrows(() => parseCourse({ course_title: 'X', course_description: '', concepts: [concept('Only one')] }));
  assertEquals(parseCourse({ course_title: '?', course_description: '', concepts: [] }).concepts, []);
});

Deno.test('parseCourseInput validates topic and language', () => {
  assertEquals(parseCourseInput({ topic: ' Astronomy ' }), { topic: 'Astronomy', language: 'Hebrew' });
  assertEquals(parseCourseInput({ topic: 'Astronomy', language: 'en' }).language, 'English');
  assertThrows(() => parseCourseInput({ topic: 'x' }), HttpError, 'topic');
  assertThrows(() => parseCourseInput({ topic: 'Astronomy', language: 'fr' }), HttpError, 'language');
});

Deno.test('generateCourse sends topic and language; a non-topic becomes 422', async () => {
  let user = '';
  const llm: StructuredLlm = async (req) => {
    user = req.user;
    return req.parse({ course_title: 'Astronomy', course_description: 'd', concepts: [concept('Stars'), concept('Planets'), concept('Moons')] });
  };
  const result = await generateCourse(llm, { topic: 'Astronomy', language: 'Hebrew' });
  assertEquals(result.course.concepts.length, 3);
  assertStringIncludes(user, 'LANGUAGE: Hebrew');
  assertStringIncludes(user, '<topic>\nAstronomy\n</topic>');

  const refusing: StructuredLlm = async (req) => req.parse({ course_title: '?', course_description: '', concepts: [] });
  const err = await assertRejects(() => generateCourse(refusing, { topic: 'asdf', language: 'Hebrew' }), HttpError);
  assertEquals(err.code, 'invalid_topic');
});
