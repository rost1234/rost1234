import { HttpError, requireText, stringList } from '../_shared/http.ts';
import type { StructuredLlm } from '../_shared/llm.ts';
import {
  buildLessonUserMessage,
  LESSON_LEVELS,
  LESSON_PROMPT_VERSION,
  LESSON_RESPONSE_SCHEMA,
  lessonSystemPrompt,
  type LessonLevel,
  parseLesson,
  type WrittenLesson,
} from '../_shared/lesson-writer.ts';

const LANGUAGES: Record<string, string> = { he: 'Hebrew', en: 'English' };

export interface LessonInput {
  level: LessonLevel;
  language: string;
  courseTitle: string;
  conceptTitle: string;
  summary: string;
  previousTitles: string[];
}

export function parseLessonInput(body: Record<string, unknown>): LessonInput {
  const level = (typeof body.level === 'string' ? body.level : 'standalone') as LessonLevel;
  if (!LESSON_LEVELS.includes(level)) throw new HttpError(400, 'unknown level', 'invalid_input');
  const language = LANGUAGES[typeof body.language === 'string' ? body.language : 'he'];
  if (!language) throw new HttpError(400, 'language must be "he" or "en"', 'invalid_input');
  return {
    level,
    language,
    courseTitle: typeof body.course_title === 'string' ? body.course_title.trim().slice(0, 200) : '',
    conceptTitle: requireText(body.concept_title, 'concept_title', 1, 200),
    summary: typeof body.summary === 'string' ? body.summary.trim().slice(0, 500) : '',
    previousTitles: stringList(body.previous_titles, 'previous_titles', 40, 200),
  };
}

export async function writeLesson(llm: StructuredLlm, input: LessonInput): Promise<{ prompt_version: string; lesson: WrittenLesson }> {
  const lesson = await llm({
    name: 'lesson',
    system: lessonSystemPrompt(input.level),
    user: buildLessonUserMessage(input),
    schema: LESSON_RESPONSE_SCHEMA,
    parse: parseLesson,
    temperature: 0.3,
    maxOutputTokens: 3000,
  });
  if (!lesson.explanation) throw new HttpError(422, 'That concept could not be turned into a lesson', 'invalid_topic');
  return { prompt_version: LESSON_PROMPT_VERSION, lesson };
}
