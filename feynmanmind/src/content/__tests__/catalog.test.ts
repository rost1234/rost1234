import { BUILT_IN_COURSES } from '../catalog';
import { LEVEL_KEYS, stationsOf, unitsOf } from '../types';

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
      expect(level.stations.length).toBeGreaterThanOrEqual(12);
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

  it('group every level into named units of 3 to 5 stations', () => {
    for (const course of BUILT_IN_COURSES) {
      for (const level of course.levels) {
        const units = unitsOf(level.stations);
        expect(units.length).toBeGreaterThanOrEqual(3);
        for (const unit of units) {
          expect(unit.title).toBeTruthy();
          expect(unit.stations.length).toBeGreaterThanOrEqual(3);
          expect(unit.stations.length).toBeLessThanOrEqual(5);
        }
        // A unit name appears in one run only, so the map never splits it.
        expect(new Set(units.map((u) => u.title)).size).toBe(units.length);
      }
    }
  });
  it('cite their sources as https links', () => {
    for (const course of BUILT_IN_COURSES) {
      expect(course.sources?.length ?? 0).toBeGreaterThan(0);
      for (const source of course.sources ?? []) {
        expect(source.label.trim()).not.toBe('');
        expect(source.url).toMatch(/^https:\/\/\S+$/);
      }
    }
  });

  it('keep map summaries short and placement questions distinct', () => {
    for (const course of BUILT_IN_COURSES) {
      for (const { station } of stationsOf(course)) expect(station.summary.length).toBeLessThanOrEqual(160);
      const questions = course.levels.flatMap((l) => l.quiz.map((q) => q.question));
      expect(new Set(questions).size).toBe(questions.length);
      for (const q of course.levels.flatMap((l) => l.quiz)) {
        for (const option of q.options) expect(option.trim()).not.toBe('');
      }
    }
  });
});

describe('unitsOf', () => {
  const s = (key: string, unit?: string) => ({ key, title: key, summary: '', ...(unit ? { unit } : {}) });

  it('groups consecutive stations that share a unit', () => {
    const units = unitsOf([s('a', 'U1'), s('b', 'U1'), s('c', 'U2')]);
    expect(units.map((u) => [u.title, u.stations.map((x) => x.key)])).toEqual([
      ['U1', ['a', 'b']],
      ['U2', ['c']],
    ]);
  });

  it('chunks stations without units (older AI courses) into groups of four', () => {
    const units = unitsOf(['a', 'b', 'c', 'd', 'e', 'f'].map((k) => s(k)));
    expect(units.map((u) => [u.title, u.stations.length])).toEqual([
      [null, 4],
      [null, 2],
    ]);
  });
});
