import { computeSnapshot, createTimer, formatClock, pauseTimer, resumeTimer } from '../focusTimer';

const t0 = new Date('2026-09-24T10:00:00.000Z');
const at = (seconds: number) => new Date(t0.getTime() + seconds * 1000);

describe('stateless focus timer', () => {
  it('derives remaining time purely from timestamps (survives backgrounding)', () => {
    const timer = createTimer(25, { habitId: null, taskId: null }, t0);
    expect(computeSnapshot(timer, at(60))).toMatchObject({ elapsedSeconds: 60, remainingSeconds: 24 * 60, isFinished: false });
    // App was suspended for an hour: the session is simply over.
    expect(computeSnapshot(timer, at(3600))).toMatchObject({ remainingSeconds: 0, isFinished: true, elapsedSeconds: 1500 });
  });

  it('excludes paused time', () => {
    let timer = createTimer(10, { habitId: 'h', taskId: null }, t0);
    timer = pauseTimer(timer, at(120));
    expect(computeSnapshot(timer, at(900)).elapsedSeconds).toBe(120);
    timer = resumeTimer(timer, at(900));
    expect(computeSnapshot(timer, at(960)).elapsedSeconds).toBe(180);
  });

  it('formats the clock', () => {
    expect(formatClock(1500)).toBe('25:00');
    expect(formatClock(61)).toBe('01:01');
  });
});
