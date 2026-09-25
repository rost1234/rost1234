import { BUILT_IN_COURSES } from '../catalog';
import { LEVEL_KEYS, stationsOf } from '../types';

describe('built-in courses', () => {
  it('have unique ids, and unique station keys and titles within each course', () => {
    expect(new Set(BUILT_IN_COURSES.map((c) => c.id)).size).toBe(BUILT_IN_COURSES.length);
    for (const course of BUILT_IN_COURSES) {
      const stations = stationsOf(course).map((s) => s.station);
      expect(new Set(stations.map((s) => s.key)).size).toBe(stations.length);
      expect(new Set(stations.map((s) => s.title)).size).toBe(stations.length);
    }
  });

  it.each(BUILT_IN_COURSES.map((c) => [c.id, c] as const))('%s climbs all four levels, from foundations to master', (_id, course) => {
    expect(course.levels.map((l) => l.key)).toEqual([...LEVEL_KEYS]);
    for (const level of course.levels) {
      expect(level.stations.length).toBeGreaterThanOrEqual(5);
      expect(level.quiz.length).toBe(3);
      for (const q of level.quiz) {
        expect(q.options.length).toBe(4);
        expect(new Set(q.options).size).toBe(4);
        expect(q.correct).toBeGreaterThanOrEqual(0);
        expect(q.correct).toBeLessThan(q.options.length);
      }
    }
  });

  it.each(BUILT_IN_COURSES.flatMap((c) => c.levels[0]!.stations.map((k) => [`${c.id}/${k.key}`, k] as const)))(
    'foundation station %s ships with a full lesson',
    (_id, station) => {
      expect(station.summary.length).toBeGreaterThan(10);
      expect(station.explanation!.length).toBeGreaterThan(300);
      expect(station.cards!.length).toBeGreaterThanOrEqual(3);
      for (const card of station.cards!) {
        expect(card.question.trim().length).toBeGreaterThan(3);
        expect(card.answer.trim().length).toBeGreaterThan(0);
      }
    },
  );

  it('upper-level stations have a title and summary (lessons come from the AI)', () => {
    for (const course of BUILT_IN_COURSES) {
      for (const level of course.levels.slice(1)) {
        for (const s of level.stations) {
          expect(s.title.trim()).not.toBe('');
          expect(s.summary.length).toBeGreaterThan(10);
        }
      }
    }
  });
});
