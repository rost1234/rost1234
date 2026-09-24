import { calculateNextReview, initialReviewData } from '../sm2';

const T0 = new Date('2026-01-01T00:00:00.000Z');
const day = (n: number) => new Date(T0.getTime() + n * 86_400_000).toISOString();

describe('calculateNextReview (SM-2)', () => {
  it('first successful review → 1 day', () => {
    const r = calculateNextReview(initialReviewData(T0), 4, T0);
    expect(r.repetitions).toBe(1);
    expect(r.interval_days).toBe(1);
    expect(r.easiness_factor).toBe(2.5); // q=4 leaves EF unchanged
    expect(r.next_review_date).toBe(day(1));
    expect(r.last_reviewed_at).toBe(T0.toISOString());
  });

  it('second successful review → 6 days, third → round(6 × EF)', () => {
    let r = calculateNextReview(initialReviewData(T0), 5, T0);
    expect(r.easiness_factor).toBe(2.6);
    r = calculateNextReview(r, 5, T0);
    expect(r.interval_days).toBe(6);
    expect(r.easiness_factor).toBe(2.7);
    r = calculateNextReview(r, 5, T0);
    expect(r.interval_days).toBe(Math.round(6 * 2.7)); // uses EF before update
    expect(r.repetitions).toBe(3);
  });

  it('lapse resets repetitions and interval but keeps lowered EF', () => {
    const mature = { ...initialReviewData(T0), easiness_factor: 2.5, interval_days: 30, repetitions: 5 };
    const r = calculateNextReview(mature, 2, T0);
    expect(r.repetitions).toBe(0);
    expect(r.interval_days).toBe(1);
    expect(r.easiness_factor).toBe(2.18);
  });

  it('floors EF at 1.3', () => {
    let r = initialReviewData(T0);
    for (let i = 0; i < 10; i++) r = calculateNextReview(r, 0, T0);
    expect(r.easiness_factor).toBe(1.3);
  });

  it.each([
    [0, 1.7],
    [1, 1.96],
    [2, 2.18],
    [3, 2.36],
    [4, 2.5],
    [5, 2.6],
  ])('quality %i → EF %f', (q, ef) => {
    expect(calculateNextReview(initialReviewData(T0), q, T0).easiness_factor).toBe(ef);
  });

  it.each([-1, 6, 2.5, Number.NaN])('rejects quality %p', (q) => {
    expect(() => calculateNextReview(initialReviewData(T0), q, T0)).toThrow(RangeError);
  });

  it('does not mutate input', () => {
    const input = initialReviewData(T0);
    const snapshot = structuredClone(input);
    calculateNextReview(input, 5, T0);
    expect(input).toEqual(snapshot);
  });
});
