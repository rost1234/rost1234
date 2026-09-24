import { previewIntervals, QUALITY_OPTIONS } from '../qualities';
import { summarizeSession } from '../session';
import { initialReviewData } from '../sm2';

describe('grade options', () => {
  it('covers SM-2 grades 0–5 in order', () => {
    expect(QUALITY_OPTIONS.map((o) => o.quality)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('previews intervals for a mature card', () => {
    const review = { ...initialReviewData(), easiness_factor: 2.5, interval_days: 10, repetitions: 3 };
    const preview = previewIntervals(review);
    expect(preview[0]).toBe(1);
    expect(preview[2]).toBe(1);
    expect(preview[3]).toBe(25);
    expect(preview[5]).toBe(25);
  });
});

describe('summarizeSession', () => {
  it('counts grades ≥ 3 as recalled', () => {
    expect(summarizeSession([5, 4, 2, 0])).toEqual({ reviewed: 4, recalled: 2, recallPct: 50 });
  });
  it('handles an empty session', () => {
    expect(summarizeSession([])).toEqual({ reviewed: 0, recalled: 0, recallPct: null });
  });
});
