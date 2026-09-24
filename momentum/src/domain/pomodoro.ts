import { computeSnapshot, type PersistedTimer, type PomodoroPhase } from './focusTimer';

/** Classic Pomodoro: 25 min focus, 5 min break, 4 cycles (the last cycle ends without a break). */
export const CLASSIC_POMODORO = { workMinutes: 25, breakMinutes: 5, totalCycles: 4 } as const;

export function firstPhase(plan: Pick<PomodoroPhase, 'workMinutes' | 'breakMinutes' | 'totalCycles'>): PomodoroPhase {
  return { ...plan, cycle: 1, phase: 'work' };
}

export function phaseMinutes(phase: PomodoroPhase): number {
  return phase.phase === 'work' ? phase.workMinutes : phase.breakMinutes;
}

/** work(c) → break(c) → work(c+1) … ; the final work phase ends the session (null). */
export function nextPhase(phase: PomodoroPhase): PomodoroPhase | null {
  if (phase.phase === 'work') {
    return phase.cycle >= phase.totalCycles ? null : { ...phase, phase: 'break' };
  }
  return { ...phase, cycle: phase.cycle + 1, phase: 'work' };
}

/** Wall-clock end of the timer's current phase (accounts for past pauses). */
export function phaseEnd(timer: PersistedTimer): Date {
  return new Date(new Date(timer.startTime).getTime() + timer.pausedAccumulatedMs + timer.targetDurationMinutes * 60_000);
}

export interface CompletedWork {
  startTime: string;
  endTime: string;
  minutes: number;
}

export interface AdvanceResult {
  /** The timer now running, or null when the whole Pomodoro is done. */
  timer: PersistedTimer | null;
  /** Work phases that finished and should be logged as focus sessions. */
  completedWork: CompletedWork[];
}

/**
 * Stateless catch-up: rolls finished phases forward, each new phase starting
 * exactly when the previous one ended — so the schedule stays correct even if
 * the app was closed through several phases.
 */
export function advanceFinishedPhases(timer: PersistedTimer, now: Date = new Date()): AdvanceResult {
  const completedWork: CompletedWork[] = [];
  let current: PersistedTimer | null = timer;

  for (let guard = 0; current && current.pomodoro && guard < 32; guard += 1) {
    if (!computeSnapshot(current, now).isFinished) break;
    const phase: PomodoroPhase = current.pomodoro;
    const end = phaseEnd(current);
    if (phase.phase === 'work') {
      completedWork.push({ startTime: current.startTime, endTime: end.toISOString(), minutes: phase.workMinutes });
    }
    const next = nextPhase(phase);
    current = next
      ? {
          ...current,
          startTime: end.toISOString(),
          pausedAccumulatedMs: 0,
          pausedAt: null,
          targetDurationMinutes: phaseMinutes(next),
          pomodoro: next,
        }
      : null;
  }
  return { timer: current, completedWork };
}

export interface UpcomingPhaseEnd {
  at: Date;
  /** The phase that ends at `at`. */
  ending: PomodoroPhase;
}

/** Every future phase change from now on (for scheduling notifications up front). */
export function upcomingPhaseEnds(timer: PersistedTimer): UpcomingPhaseEnd[] {
  const result: UpcomingPhaseEnd[] = [];
  if (!timer.pomodoro || timer.pausedAt) return result;
  let phase: PomodoroPhase | null = timer.pomodoro;
  let at = phaseEnd(timer);
  while (phase) {
    result.push({ at, ending: phase });
    const next = nextPhase(phase);
    if (!next) break;
    at = new Date(at.getTime() + phaseMinutes(next) * 60_000);
    phase = next;
  }
  return result;
}
