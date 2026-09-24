import { createTimer, pauseTimer, resumeTimer, type PersistedTimer } from '../focusTimer';
import { CLASSIC_POMODORO, advanceFinishedPhases, firstPhase, nextPhase, upcomingPhaseEnds } from '../pomodoro';

const t0 = new Date('2026-09-24T10:00:00.000Z');
const at = (minutes: number) => new Date(t0.getTime() + minutes * 60_000);
const pomodoroTimer = (): PersistedTimer => ({
  ...createTimer(25, { habitId: null, taskId: null }, t0),
  pomodoro: firstPhase(CLASSIC_POMODORO),
});

describe('pomodoro', () => {
  it('walks work → break → work and ends after the last work phase', () => {
    let phase = firstPhase({ workMinutes: 25, breakMinutes: 5, totalCycles: 2 });
    const seen = [`${phase.phase}${phase.cycle}`];
    for (let next = nextPhase(phase); next; next = nextPhase(phase)) {
      phase = next;
      seen.push(`${phase.phase}${phase.cycle}`);
    }
    expect(seen).toEqual(['work1', 'break1', 'work2']);
  });

  it('does nothing while the current phase is running', () => {
    const result = advanceFinishedPhases(pomodoroTimer(), at(10));
    expect(result.completedWork).toEqual([]);
    expect(result.timer?.pomodoro).toMatchObject({ phase: 'work', cycle: 1 });
  });

  it('catches up across several phases while the app was closed', () => {
    // 25 work + 5 break + 25 work + 5 break = 60; at 62 min we are in work 3.
    const result = advanceFinishedPhases(pomodoroTimer(), at(62));
    expect(result.completedWork.map((w) => w.minutes)).toEqual([25, 25]);
    expect(result.completedWork[1]?.startTime).toBe(at(30).toISOString());
    expect(result.timer?.pomodoro).toMatchObject({ phase: 'work', cycle: 3 });
    expect(result.timer?.startTime).toBe(at(60).toISOString());
  });

  it('finishes the whole session after the final work phase', () => {
    const result = advanceFinishedPhases(pomodoroTimer(), at(200));
    expect(result.timer).toBeNull();
    expect(result.completedWork).toHaveLength(4);
  });

  it('shifts phase ends by paused time and lists upcoming changes', () => {
    let timer = pomodoroTimer();
    timer = resumeTimer(pauseTimer(timer, at(5)), at(15)); // 10 min paused
    const ends = upcomingPhaseEnds(timer);
    expect(ends).toHaveLength(7);
    expect(ends[0]).toMatchObject({ at: at(35), ending: { phase: 'work', cycle: 1 } });
    expect(ends[1]?.at).toEqual(at(40));
    expect(upcomingPhaseEnds(pauseTimer(timer, at(20)))).toEqual([]);
  });
});
