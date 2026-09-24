import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateNextReview, initialReviewData } from './sm2.ts';

const T0 = new Date('2026-01-01T00:00:00.000Z');
const day = (n: number) => new Date(T0.getTime() + n * 86_400_000).toISOString();

test('first successful review → 1 day', () => {
  const r = calculateNextReview(initialReviewData(T0), 4, T0);
  assert.equal(r.repetitions, 1);
  assert.equal(r.interval_days, 1);
  assert.equal(r.easiness_factor, 2.5); // q=4 leaves EF unchanged
  assert.equal(r.next_review_date, day(1));
  assert.equal(r.last_reviewed_at, T0.toISOString());
});

test('second successful review → 6 days, third → round(6 × EF)', () => {
  let r = calculateNextReview(initialReviewData(T0), 5, T0);
  assert.equal(r.easiness_factor, 2.6);
  r = calculateNextReview(r, 5, T0);
  assert.equal(r.interval_days, 6);
  assert.equal(r.easiness_factor, 2.7);
  r = calculateNextReview(r, 5, T0);
  assert.equal(r.interval_days, Math.round(6 * 2.7)); // uses EF before update
  assert.equal(r.repetitions, 3);
});

test('lapse resets repetitions and interval but keeps lowered EF', () => {
  const mature = { ...initialReviewData(T0), easiness_factor: 2.5, interval_days: 30, repetitions: 5 };
  const r = calculateNextReview(mature, 2, T0);
  assert.equal(r.repetitions, 0);
  assert.equal(r.interval_days, 1);
  assert.equal(r.easiness_factor, 2.18);
});

test('EF is floored at 1.3', () => {
  let r = initialReviewData(T0);
  for (let i = 0; i < 10; i++) r = calculateNextReview(r, 0, T0);
  assert.equal(r.easiness_factor, 1.3);
});

test('EF deltas per quality match SM-2 table', () => {
  const expected = { 0: 1.7, 1: 1.96, 2: 2.18, 3: 2.36, 4: 2.5, 5: 2.6 } as const;
  for (const [q, ef] of Object.entries(expected)) {
    assert.equal(calculateNextReview(initialReviewData(T0), Number(q), T0).easiness_factor, ef);
  }
});

test('rejects invalid quality scores', () => {
  for (const q of [-1, 6, 2.5, Number.NaN]) {
    assert.throws(() => calculateNextReview(initialReviewData(T0), q, T0), RangeError);
  }
});

test('does not mutate input', () => {
  const input = initialReviewData(T0);
  const snapshot = structuredClone(input);
  calculateNextReview(input, 5, T0);
  assert.deepEqual(input, snapshot);
});
