import { applyPrimaryAction, dailyProgressPercent, decrementProgress, type LogProgress, isPartialBinary, PARTIAL_BINARY, completionRatio, reevaluateProgress, setAmount } from '../habitProgress';

const water = { isQuantitative: true, targetCount: 4 };
const read = { isQuantitative: false, targetCount: 1 };
const start: LogProgress = { currentCount: 0, status: 'in_progress' };

describe('habit progress', () => {
  it('increments quantitative habits and completes at the target', () => {
    let p = start;
    for (let i = 0; i < 3; i += 1) p = applyPrimaryAction(water, p);
    expect(p).toEqual({ currentCount: 3, status: 'in_progress' });
    p = applyPrimaryAction(water, p);
    expect(p).toEqual({ currentCount: 4, status: 'completed' });
    expect(decrementProgress(water, p)).toEqual({ currentCount: 3, status: 'in_progress' });
  });

  it('toggles binary habits', () => {
    const done = applyPrimaryAction(read, start);
    expect(done.status).toBe('completed');
    expect(applyPrimaryAction(read, done).status).toBe('in_progress');
  });

  it('computes daily percent, ignoring skipped habits', () => {
    expect(
      dailyProgressPercent([
        { habit: water, progress: { currentCount: 2, status: 'in_progress' } },
        { habit: read, progress: { currentCount: 1, status: 'completed' } },
        { habit: read, progress: { currentCount: 0, status: 'skipped' } },
      ]),
    ).toBe(75);
    expect(dailyProgressPercent([])).toBe(0);
  });
});

describe('smart marking', () => {
  const binary = { isQuantitative: false, targetCount: 1 };
  const sets = { isQuantitative: true, targetCount: 3 };

  it('a yes/no habit done in part reads as partial, and one tap completes it', () => {
    expect(isPartialBinary(binary, PARTIAL_BINARY)).toBe(true);
    expect(completionRatio(binary, PARTIAL_BINARY)).toBe(0.5);
    expect(applyPrimaryAction(binary, PARTIAL_BINARY)).toEqual({ currentCount: 1, status: 'completed' });
    expect(isPartialBinary(binary, { currentCount: 0, status: 'in_progress' })).toBe(false);
    // Editing the habit keeps "in part" as it is.
    expect(reevaluateProgress(binary, PARTIAL_BINARY)).toEqual(PARTIAL_BINARY);
  });

  it('the amount can be set directly: 2 of 3 sets is partial, 3 is done', () => {
    expect(setAmount(sets, 2)).toEqual({ currentCount: 2, status: 'in_progress' });
    expect(setAmount(sets, 3)).toEqual({ currentCount: 3, status: 'completed' });
    expect(setAmount(sets, -4)).toEqual({ currentCount: 0, status: 'in_progress' });
  });
});
