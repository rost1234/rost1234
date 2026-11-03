import { ImportError, parseLessonImport } from '../import';

const ROP = {
  topic: 'Buffer Overflow',
  concept: 'ROP (Return-Oriented Programming)',
  reference: 'כשהגנת NX חוסמת הרצת shellcode על המחסנית, בונים שרשרת מתוך gadgets.',
  keyPoints: ['NX חוסם הרצה על המחסנית', 'gadget מסתיים ב-ret'],
};

const problem = (text: string) => {
  try {
    parseLessonImport(text);
  } catch (e) {
    if (e instanceof ImportError) return e.problem;
    throw e;
  }
  throw new Error('expected an ImportError');
};

describe('parseLessonImport', () => {
  it('parses the documented format and trims fields', () => {
    expect(parseLessonImport(JSON.stringify([{ ...ROP, topic: '  Buffer Overflow ' }]))).toEqual([ROP]);
  });

  it('keyPoints is optional; empty points are dropped', () => {
    const [a, b] = parseLessonImport(JSON.stringify([{ topic: 'a', concept: 'b', reference: 'c' }, { topic: 'a', concept: 'd', reference: 'e', keyPoints: ['', ' '] }]));
    expect(a).toEqual({ topic: 'a', concept: 'b', reference: 'c' });
    expect(b!.keyPoints).toBeUndefined();
  });

  it('accepts a single object, { lessons: [...] } and a ```json fence', () => {
    expect(parseLessonImport(JSON.stringify(ROP))).toHaveLength(1);
    expect(parseLessonImport(JSON.stringify({ lessons: [ROP, ROP] }))).toHaveLength(2);
    expect(parseLessonImport('```json\n' + JSON.stringify([ROP]) + '\n```')).toHaveLength(1);
  });

  it('reports clear problems instead of throwing anything else', () => {
    expect(problem('   ')).toEqual({ code: 'empty' });
    expect(problem('[{"topic": "a",}]')).toMatchObject({ code: 'json' });
    expect(problem('"text"')).toEqual({ code: 'not_array' });
    expect(problem('[]')).toEqual({ code: 'no_items' });
    expect(problem('[1]')).toEqual({ code: 'item_not_object', item: 1 });
    expect(problem(JSON.stringify([ROP, { topic: 'a', concept: 'b' }]))).toEqual({ code: 'missing_field', item: 2, field: 'reference' });
    expect(problem(JSON.stringify([{ topic: 'a', concept: '  ', reference: 'c' }]))).toEqual({ code: 'missing_field', item: 1, field: 'concept' });
    expect(problem(JSON.stringify([{ ...ROP, keyPoints: 'one' }]))).toEqual({ code: 'bad_key_points', item: 1 });
    expect(problem(JSON.stringify([{ ...ROP, keyPoints: [1] }]))).toEqual({ code: 'bad_key_points', item: 1 });
  });
});

describe('full lessons in the file', () => {
  const full = {
    ...ROP,
    hook: 'איך מריצים קוד כשאסור להריץ קוד?',
    sections: [{ heading: 'הרעיון', body: 'משתמשים בקוד שכבר קיים.' }],
    example: { title: 'דוגמה: שרשרת', body: 'pop rdi; ret ואז system.' },
    misconception: { myth: 'NX עוצר הכול.', truth: 'NX עוצר רק הרצה של קוד מוזרק.' },
    check: [{ question: 'במה gadget מסתיים?', options: ['ret', 'jmp', 'call', 'nop'], correct: 0, why: 'כך משרשרים.' }],
    cards: [{ question: 'מה זה gadget?', answer: 'קטע קוד קצר שמסתיים ב-ret.' }, { question: '', answer: 'x' }],
  };

  it('parses the lesson parts and extra cards', () => {
    const [lesson] = parseLessonImport(JSON.stringify([full]));
    expect(lesson!.parts).toMatchObject({ hook: full.hook, sections: full.sections, example: full.example, check: full.check });
    expect(lesson!.cards).toEqual([full.cards[0]]);
  });

  it('rejects an incomplete lesson or bad cards, with the item number', () => {
    expect(problem(JSON.stringify([ROP, { ...full, hook: '' }]))).toEqual({ code: 'bad_lesson', item: 2, detail: 'hook' });
    expect(problem(JSON.stringify([{ ...full, sections: [] }]))).toMatchObject({ code: 'bad_lesson', item: 1 });
    expect(problem(JSON.stringify([{ ...full, check: [{ ...full.check[0], options: ['a', 'a', 'b', 'c'] }] }]))).toMatchObject({ code: 'bad_lesson', detail: 'check 1 needs 4 distinct options' });
    expect(problem(JSON.stringify([{ ...ROP, cards: 'x' }]))).toEqual({ code: 'bad_cards', item: 1 });
  });
});
