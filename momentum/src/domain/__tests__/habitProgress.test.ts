import { applyPrimaryAction, dailyProgressPercent, decrementProgress, type LogProgress } from '../habitProgress';

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
