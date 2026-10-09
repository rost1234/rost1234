import { lessonPlainText, lessonProblems, type LessonParts } from '../lesson';

const good: LessonParts = {
  hook: 'שאלה?',
  sections: [{ heading: 'כותרת', body: 'גוף' }],
  misconception: { myth: 'מיתוס', truth: 'אמת' },
  check: [{ question: 'ש?', options: ['א', 'ב', 'ג', 'ד'], correct: 3, why: 'כי' }],
};

describe('structured lessons', () => {
  it('turn into plain text in reading order', () => {
    expect(lessonPlainText(good)).toBe('שאלה?\n\nכותרת\nגוף\n\nמיתוס\nאמת');
  });

  it('report what is wrong with them', () => {
    expect(lessonProblems(good)).toEqual([]);
    const bad = { ...good, hook: ' ', check: [{ question: 'ש?', options: ['א', 'א', 'ג', 'ד'], correct: 4, why: '' }] };
    expect(lessonProblems(bad)).toEqual(['hook is empty', 'check 1 needs a question and a why', 'check 1 needs 4 distinct options', 'check 1 has a bad correct index']);
  });
});
