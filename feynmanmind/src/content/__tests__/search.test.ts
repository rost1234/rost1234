import { BUILT_IN_COURSES } from '../catalog';
import { searchAll } from '../search';
import { emptyDB, type LocalDB } from '../../local/types';

const db: LocalDB = {
  ...emptyDB(),
  subjects: { s1: { id: 's1', title: 'מושגים חופשיים', created_at: '2026-01-01T00:00:00.000Z' } },
  concepts: { c1: { id: 'c1', subject_id: 's1', title: 'אנטרופיה', mastery_level: 0, created_at: '2026-01-01T00:00:00.000Z' } },
} as LocalDB;

describe('searchAll', () => {
  it('finds courses, library concepts and stations by title', () => {
    expect(searchAll(db, BUILT_IN_COURSES, 'ביולוגיה')[0]).toMatchObject({ kind: 'course', id: 'biology', href: '/course/biology' });
    expect(searchAll(db, BUILT_IN_COURSES, 'אנטרופ')).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'concept', id: 'c1', href: '/concept/c1' })]));
    const stations = searchAll(db, BUILT_IN_COURSES, 'תא').filter((h) => h.kind === 'station');
    expect(stations.length).toBeGreaterThan(0);
    expect(stations[0]!.href).toMatch(/^\/course\/[a-z]+\/.+/);
  });

  it('ignores very short queries and caps the results', () => {
    expect(searchAll(db, BUILT_IN_COURSES, ' א ')).toEqual([]);
    expect(searchAll(db, BUILT_IN_COURSES, 'ה', 5)).toEqual([]);
    expect(searchAll(db, BUILT_IN_COURSES, 'של', 5).length).toBeLessThanOrEqual(5);
  });
});
