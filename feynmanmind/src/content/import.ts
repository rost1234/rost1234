/**
 * Lessons pasted in as JSON (e.g. a course prepared elsewhere). Each item is a
 * concept to explain in your own words and the reference explanation you then
 * compare yourself against:
 *
 *   [{ "topic": "Buffer Overflow", "concept": "ROP", "reference": "…", "keyPoints": ["…"] }]
 */
export interface ImportedLesson {
  /** Category; becomes the unit on the course map. */
  topic: string;
  /** The concept to explain; unique (case/spacing-insensitive) across imports. */
  concept: string;
  /** The full reference explanation, revealed after explaining. */
  reference: string;
  /** Points a good explanation should include (optional). */
  keyPoints?: string[];
}

export type ImportProblem =
  | { code: 'empty' }
  | { code: 'json'; detail: string }
  | { code: 'not_array' }
  | { code: 'no_items' }
  | { code: 'item_not_object'; item: number }
  | { code: 'missing_field'; item: number; field: 'topic' | 'concept' | 'reference' }
  | { code: 'bad_key_points'; item: number };

export class ImportError extends Error {
  readonly code = 'import';
  constructor(readonly problem: ImportProblem) {
    super(`Invalid import: ${problem.code}`);
    this.name = 'ImportError';
  }
}

/** Same concept despite case or spacing. */
export const conceptKey = (s: string) => s.trim().replace(/\s+/g, ' ').toLocaleLowerCase();

/**
 * Parses pasted JSON into lessons. Accepts an array, a single lesson object, or
 * `{ "lessons": [...] }`, and ignores a surrounding ```json fence. Throws an
 * ImportError (with the 1-based item number where it applies) instead of
 * accepting anything partially.
 */
export function parseLessonImport(text: string): ImportedLesson[] {
  const raw = text
    .trim()
    .replace(/^```[a-zA-Z]*\s*/, '')
    .replace(/\s*```$/, '')
    .trim();
  if (!raw) throw new ImportError({ code: 'empty' });

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    throw new ImportError({ code: 'json', detail: e instanceof Error ? e.message : String(e) });
  }
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const lessons = (data as { lessons?: unknown }).lessons;
    data = Array.isArray(lessons) ? lessons : [data];
  }
  if (!Array.isArray(data)) throw new ImportError({ code: 'not_array' });
  if (!data.length) throw new ImportError({ code: 'no_items' });

  return data.map((value, i): ImportedLesson => {
    const item = i + 1;
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ImportError({ code: 'item_not_object', item });
    const o = value as Record<string, unknown>;
    const field = (name: 'topic' | 'concept' | 'reference') => {
      const v = o[name];
      if (typeof v !== 'string' || !v.trim()) throw new ImportError({ code: 'missing_field', item, field: name });
      return v.trim();
    };
    const lesson: ImportedLesson = { topic: field('topic'), concept: field('concept'), reference: field('reference') };
    if (o.keyPoints !== undefined && o.keyPoints !== null) {
      if (!Array.isArray(o.keyPoints) || o.keyPoints.some((p) => typeof p !== 'string')) throw new ImportError({ code: 'bad_key_points', item });
      const points = (o.keyPoints as string[]).map((p) => p.trim()).filter(Boolean);
      if (points.length) lesson.keyPoints = points;
    }
    return lesson;
  });
}
