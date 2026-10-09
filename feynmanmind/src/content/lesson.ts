/**
 * The structured lesson: a short hook, the core idea in titled sections, a
 * concrete (or worked) example, a common misconception, how it connects to
 * earlier stations, and a few check-yourself questions. Built-in foundations
 * lessons ship in this shape; the AI writes upper-level lessons in it too.
 * (The AI's version lives in supabase/functions/_shared/lesson-writer.ts.)
 */
export interface LessonParts {
  /** 1–2 sentences: a question or everyday situation that makes the topic matter. */
  hook: string;
  /** The core explanation, 2–4 sections, each a heading and 1–2 short paragraphs (blank-line separated). */
  sections: { heading: string; body: string }[];
  /** A concrete example; at university levels a worked example, step by step. */
  example?: { title: string; body: string };
  /** What people often get wrong, and what is actually true. */
  misconception?: { myth: string; truth: string };
  /** One or two sentences linking this lesson to what came before (or what comes next). */
  connection?: string;
  /** 2–3 multiple-choice questions to check understanding right after reading. */
  check: CheckQuestion[];
}

export interface CheckQuestion {
  question: string;
  /** Exactly 4 distinct options. */
  options: string[];
  /** 0-based index of the right option. */
  correct: number;
  /** One or two sentences: why that answer is right (shown after answering). */
  why: string;
}

/** The lesson as plain text (for the AI tutor, lesson questions, copying and reading time). */
export function lessonPlainText(parts: LessonParts): string {
  return [
    parts.hook,
    ...parts.sections.map((s) => `${s.heading}\n${s.body}`),
    parts.example ? `${parts.example.title}\n${parts.example.body}` : '',
    parts.misconception ? `${parts.misconception.myth}\n${parts.misconception.truth}` : '',
    parts.connection ?? '',
  ]
    .map((p) => p.trim())
    .filter(Boolean)
    .join('\n\n');
}

/** Problems with a structured lesson (empty when it's fine). Used by the content tests and when saving AI lessons. */
export function lessonProblems(parts: LessonParts): string[] {
  const out: string[] = [];
  const text = (v: unknown) => typeof v === 'string' && v.trim().length > 0;
  if (!text(parts.hook)) out.push('hook is empty');
  if (!Array.isArray(parts.sections) || parts.sections.length < 1) out.push('no sections');
  parts.sections?.forEach((s, i) => {
    if (!text(s.heading) || !text(s.body)) out.push(`section ${i + 1} needs a heading and a body`);
  });
  if (parts.example && (!text(parts.example.title) || !text(parts.example.body))) out.push('example needs a title and a body');
  if (parts.misconception && (!text(parts.misconception.myth) || !text(parts.misconception.truth))) out.push('misconception needs myth and truth');
  if (!Array.isArray(parts.check)) out.push('check must be a list');
  parts.check?.forEach((q, i) => {
    if (!text(q.question) || !text(q.why)) out.push(`check ${i + 1} needs a question and a why`);
    if (!Array.isArray(q.options) || q.options.length !== 4 || new Set(q.options.map((o) => o.trim())).size !== 4) out.push(`check ${i + 1} needs 4 distinct options`);
    if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct > 3) out.push(`check ${i + 1} has a bad correct index`);
  });
  return out;
}
