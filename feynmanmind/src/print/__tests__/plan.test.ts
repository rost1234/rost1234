import { lessonSlots, planMonth, type PlanStation } from '../plan';

const station = (i: number): PlanStation => ({ courseId: 'c', courseTitle: 'C', key: `s${i}`, title: `S${i}`, parts: null, text: '', summary: 'sum', cards: [] });
const SUN_TO_THU = [0, 1, 2, 3, 4];

describe('planMonth', () => {
  it('lays lessons on the learning days and reviews at +1, +3, +7, +14 (Saturday moves to Sunday)', () => {
    const plan = planMonth(Array.from({ length: 12 }, (_, i) => station(i)), { year: 2026, month: 10, studyDays: SUN_TO_THU, perDay: 1 });
    expect(plan.days).toHaveLength(30);
    expect(plan.stations.map((s) => s.learn.slice(8))).toEqual(['01', '02', '03', '04', '05', '08', '09', '10', '11', '12', '15', '16']);
    // Nov 1 (Sunday) → 2, 4, 8, 15.
    expect(plan.stations[0]!.reviews).toEqual(['2026-11-02', '2026-11-04', '2026-11-08', '2026-11-15']);
    // Nov 2 + 5 days = Saturday the 7th? No: +3 = Thursday 5th; +7 = Monday 9th.
    expect(plan.stations[1]!.reviews).toEqual(['2026-11-03', '2026-11-05', '2026-11-09', '2026-11-16']);
    // Nov 4 + 3 = Saturday 7th → Sunday 8th.
    expect(plan.stations[3]!.reviews[1]).toBe('2026-11-08');
    // Nov 16 + 14 = Nov 30; the last ones run into next month.
    expect(plan.stations[11]!.reviews).toEqual(['2026-11-17', '2026-11-19', '2026-11-23', '2026-11-30']);
    expect(planMonth([station(0)], { year: 2026, month: 10, studyDays: [1], perDay: 1 }).stations[0]!.learn).toBe('2026-11-02');
    const late = planMonth(Array.from({ length: 30 }, (_, i) => station(i)), { year: 2026, month: 10, studyDays: SUN_TO_THU, perDay: 1 });
    expect(late.stations.at(-1)!.reviews.filter((r) => r === null).length).toBeGreaterThan(0);
    const day8 = plan.days[7]!;
    expect(day8.review).toEqual([1, 4, 5]);
    expect(plan.days[6]).toMatchObject({ rest: true, learn: [], review: [] });
    expect(plan.days[5]).toMatchObject({ quiz: true });
  });

  it('fits as many lessons as there are slots and stops when stations run out', () => {
    expect(lessonSlots({ year: 2026, month: 10, studyDays: SUN_TO_THU, perDay: 1 })).toBe(22);
    expect(lessonSlots({ year: 2026, month: 10, studyDays: SUN_TO_THU, perDay: 2 })).toBe(44);
    const two = planMonth(Array.from({ length: 5 }, (_, i) => station(i)), { year: 2026, month: 10, studyDays: [0], perDay: 2 });
    expect(two.days[0]!.learn).toEqual([1, 2]);
    expect(two.stations).toHaveLength(5);
  });
});
