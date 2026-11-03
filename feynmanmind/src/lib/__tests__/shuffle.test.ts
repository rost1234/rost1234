import { BUILT_IN_COURSES } from '@/content/catalog';
import { shuffledIndices } from '../shuffle';

describe('shuffledIndices', () => {
  it('is a stable permutation', () => {
    const a = shuffledIndices(4, 'What is a gene?');
    expect([...a].sort()).toEqual([0, 1, 2, 3]);
    expect(shuffledIndices(4, 'What is a gene?')).toEqual(a);
  });

  it('spreads the correct answer across positions in the built-in quizzes', () => {
    const positions = new Set<number>();
    for (const course of BUILT_IN_COURSES) {
      for (const level of course.levels) {
        for (const q of level.quiz) positions.add(shuffledIndices(q.options.length, q.question).indexOf(q.correct));
      }
    }
    expect(positions.size).toBe(4);
  });
});
