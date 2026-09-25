import { BUILT_IN_COURSES } from '../catalog';

describe('built-in courses', () => {
  it('have unique ids and unique concept keys and titles within each course', () => {
    expect(new Set(BUILT_IN_COURSES.map((c) => c.id)).size).toBe(BUILT_IN_COURSES.length);
    for (const course of BUILT_IN_COURSES) {
      expect(new Set(course.concepts.map((c) => c.key)).size).toBe(course.concepts.length);
      expect(new Set(course.concepts.map((c) => c.title)).size).toBe(course.concepts.length);
    }
  });

  it.each(BUILT_IN_COURSES.flatMap((c) => c.concepts.map((k) => [`${c.id}/${k.key}`, k] as const)))(
    '%s is a complete station',
    (_id, concept) => {
      expect(concept.title.trim()).not.toBe('');
      expect(concept.summary.length).toBeGreaterThan(10);
      expect(concept.explanation.length).toBeGreaterThan(300);
      expect(concept.cards.length).toBeGreaterThanOrEqual(3);
      for (const card of concept.cards) {
        expect(card.question.trim().length).toBeGreaterThan(3);
        expect(card.answer.trim().length).toBeGreaterThan(0);
        // Mirror the flashcard limits used everywhere else.
        expect(card.question.length).toBeLessThanOrEqual(1000);
        expect(card.answer.length).toBeLessThanOrEqual(2000);
      }
    },
  );
});
