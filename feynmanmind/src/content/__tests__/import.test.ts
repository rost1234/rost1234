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
