import { lessonProblems, type LessonParts } from './lesson';

/**
 * Lessons pasted in as JSON (e.g. a course prepared elsewhere). Each item is a
 * concept to explain in your own words and the reference explanation you then
 * compare yourself against:
 *
 *   [{ "topic": "Buffer Overflow", "concept": "ROP", "reference": "…", "keyPoints": ["…"] }]
 *
 * Optionally an item can carry a full lesson in the built-in lessons' shape
 * (see lesson.ts): "hook" + "sections" (and "example", "misconception",
 * "connection", "check"), plus extra "cards" [{question, answer}].
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
  /** A full structured lesson, when the file provides one. */
  parts?: LessonParts;
  /** Extra flashcards. */
  cards?: { question: string; answer: string }[];
}

export type ImportProblem =
  | { code: 'empty' }
  | { code: 'json'; detail: string }
  | { code: 'not_array' }
  | { code: 'no_items' }
  | { code: 'item_not_object'; item: number }
  | { code: 'missing_field'; item: number; field: 'topic' | 'concept' | 'reference' }
  | { code: 'bad_key_points'; item: number }
  | { code: 'bad_lesson'; item: number; detail: string }
  | { code: 'bad_cards'; item: number };

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
    const parts = lessonPartsOf(o, item);
    if (parts) lesson.parts = parts;
    if (o.cards !== undefined && o.cards !== null) {
      const ok = Array.isArray(o.cards) && o.cards.every((c) => c && typeof c === 'object' && typeof c.question === 'string' && typeof c.answer === 'string');
      if (!ok) throw new ImportError({ code: 'bad_cards', item });
      const cards = (o.cards as { question: string; answer: string }[])
        .map((c) => ({ question: c.question.trim(), answer: c.answer.trim() }))
        .filter((c) => c.question && c.answer);
      if (cards.length) lesson.cards = cards;
    }
    return lesson;
  });
}

const LESSON_FIELDS = ['hook', 'sections', 'example', 'misconception', 'connection', 'check'] as const;

/** The item's structured lesson, if it has any lesson field; throws if it's incomplete or malformed. */
function lessonPartsOf(o: Record<string, unknown>, item: number): LessonParts | undefined {
  if (!LESSON_FIELDS.some((f) => o[f] !== undefined && o[f] !== null)) return undefined;
  const bad = (detail: string) => new ImportError({ code: 'bad_lesson', item, detail });
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  if (!str(o.hook)) throw bad('hook');
  if (!Array.isArray(o.sections) || !o.sections.length) throw bad('sections');
  const sections = o.sections.map((x) => ({ heading: str((x as Record<string, unknown>)?.heading), body: str((x as Record<string, unknown>)?.body) }));
  const ex = o.example as Record<string, unknown> | undefined;
  const mis = o.misconception as Record<string, unknown> | undefined;
  if (o.check !== undefined && o.check !== null && !Array.isArray(o.check)) throw bad('check');
  const parts: LessonParts = {
    hook: str(o.hook),
    sections,
    ...(ex ? { example: { title: str(ex.title), body: str(ex.body) } } : {}),
    ...(mis ? { misconception: { myth: str(mis.myth), truth: str(mis.truth) } } : {}),
    ...(str(o.connection) ? { connection: str(o.connection) } : {}),
    check: ((o.check as Record<string, unknown>[] | undefined) ?? []).map((q) => ({
      question: str(q?.question),
      options: Array.isArray(q?.options) ? (q.options as unknown[]).map(str) : [],
      correct: typeof q?.correct === 'number' ? q.correct : -1,
      why: str(q?.why),
    })),
  };
  const problems = lessonProblems(parts);
  if (problems.length) throw bad(problems[0]!);
  return parts;
}

/**
 * Instructions to give any AI chat (with your material) so it produces lessons
 * in the full format, matching the built-in lessons' structure.
 */
export const RICH_FORMAT_PROMPT = `הפוך את חומר הלימוד שאצרף לשיעורים לאפליקציית FeynmanMind.
החזר רק מערך JSON תקין (בלי טקסט נוסף), שבו כל איבר הוא שיעור על מושג אחד:

{
  "topic": "הנושא / היחידה (למשל Buffer Overflow)",
  "concept": "שם המושג",
  "reference": "הסבר ייחוס מלא ומדויק, 3–6 משפטים, שאליו הלומד ישווה את ההסבר שלו",
  "keyPoints": ["3–5 נקודות שהסבר טוב חייב לכלול"],
  "hook": "1–2 משפטים: שאלה או מצב שגורמים למושג להיות מעניין (לא הגדרה)",
  "sections": [
    { "heading": "2–5 מילים", "body": "1–2 פסקאות קצרות; מה זה, איך ולמה זה עובד, למה זה חשוב" }
  ],
  "example": { "title": "דוגמה: …", "body": "דוגמה קונקרטית, צעד אחר צעד" },
  "misconception": { "myth": "טעות נפוצה אמיתית (רבים חושבים ש…)", "truth": "מה נכון באמת" },
  "connection": "1–2 משפטים שמקשרים למושגים קודמים",
  "check": [
    { "question": "שאלת הבנה", "options": ["4 אפשרויות שונות וסבירות"], "correct": 0, "why": "למה זו התשובה" }
  ],
  "cards": [{ "question": "שאלה שעומדת בפני עצמה", "answer": "תשובה במשפט אחד" }]
}

כללים:
- 2–4 sections, בסך הכול 250–500 מילים; בדיוק 3 שאלות check עם 4 אפשרויות שונות, ו-correct הוא האינדקס (מ-0) של התשובה הנכונה; 4 cards.
- הכול בעברית; מונחים טכניים שנהוג לומר באנגלית נשארים באנגלית.
- היצמד לחומר שצירפתי ואל תמציא עובדות. הגדר כל מונח בפעם הראשונה שהוא מופיע.
- אין צורך במרכאות כפולות בתוך טקסט; אם יש, הוסף לפניהן \\.`;
