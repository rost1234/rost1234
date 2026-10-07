import { HttpError, requireText } from '../_shared/http.ts';
import { parseLanguage } from '../_shared/language.ts';
import type { StructuredLlm } from '../_shared/llm.ts';
import {
  buildCourseUserMessage,
  COURSE_PROMPT_VERSION,
  COURSE_RESPONSE_SCHEMA,
  COURSE_SYSTEM_PROMPT,
  type GeneratedCourse,
  parseCourse,
} from '../_shared/course-generator.ts';


export interface CourseInput {
  topic: string;
  language: string;
}

export function parseCourseInput(body: Record<string, unknown>): CourseInput {
  const topic = requireText(body.topic, 'topic', 2, 200);
  const language = parseLanguage(body.language);
  return { topic, language };
}

export async function generateCourse(llm: StructuredLlm, input: CourseInput): Promise<{ prompt_version: string; course: GeneratedCourse }> {
  const course = await llm({
    name: 'guided_course',
    system: COURSE_SYSTEM_PROMPT,
    user: buildCourseUserMessage(input.topic, input.language),
    schema: COURSE_RESPONSE_SCHEMA,
    parse: parseCourse,
    temperature: 0.4,
    maxOutputTokens: 12000,
  });
  if (course.levels.length === 0) {
    throw new HttpError(422, 'That topic could not be turned into a course', 'invalid_topic');
  }
  return { prompt_version: COURSE_PROMPT_VERSION, course };
}
