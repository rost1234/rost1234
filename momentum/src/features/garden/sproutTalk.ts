import type { GrowthStage } from '@/domain/garden';

/**
 * What the Garden sprout says. It speaks for itself ("I"), never commands and never guilts:
 * it greets, thanks you for every habit, cheers a full day, and is glad when you come back.
 */
export const TALK = {
  morning: 3,
  afternoon: 3,
  evening: 2,
  night: 2,
  first: 2,
  done: 5,
  allDone: 3,
  quiet: 2,
  seed: 1,
  comeback: 2,
  tap: 3,
} as const;

export type TalkPool = keyof typeof TALK;

/** One line: a translation key and its parameters (`count` picks a plural form). */
export interface TalkLine {
  key: string;
  params?: Record<string, string | number>;
  /** Set when the key has `_one` / `_other` forms. */
  plural?: number;
}

export interface TalkContext {
  hour: number;
  /** Habits due today. */
  dueCount: number;
  doneCount: number;
  /** No habits at all yet. */
  noHabits: boolean;
  /** Back after a break (the welcome-back card would show). */
  comeback: boolean;
  /** Weekend, holiday or vacation. */
  dayOff: boolean;
  /** Longest current streak among today's habits. */
  bestStreak: number;
  stage: GrowthStage;
  stageName: string;
  nextName: string | null;
  toNext: number;
  days: number;
}

const line = (pool: TalkPool, seed: number): TalkLine => ({ key: `talk.${pool}.${(Math.abs(Math.trunc(seed)) % TALK[pool]) + 1}` });

/** What the sprout says when nothing just happened. `seed` varies the line (e.g. the day of the year). */
export function ambientLine(c: TalkContext, seed: number): TalkLine {
  if (c.noHabits) return line('seed', seed);
  if (c.comeback) return line('comeback', seed);
  if (c.dueCount > 0 && c.doneCount >= c.dueCount) return line('allDone', seed);
  if (c.hour >= 22 || c.hour < 5) return line('night', seed);
  if (c.dueCount === 0 || c.dayOff) return line('quiet', seed);
  // Every few days, a word about the streak instead of the time of day.
  if (c.bestStreak >= 3 && seed % 3 === 0) return { key: 'talk.streak', params: { count: c.bestStreak } };
  if (c.hour < 12) return line('morning', seed);
  if (c.hour < 18) return line('afternoon', seed);
  return line('evening', seed);
}

/** Right after a habit was done: thanks, the day's first drop, or a full day. */
export function doneLine(c: TalkContext, seed: number): TalkLine {
  if (c.dueCount > 0 && c.doneCount >= c.dueCount) return line('allDone', seed);
  if (c.doneCount === 1) return line('first', seed);
  return line('done', seed);
}

/** When the sprout is tapped: a little reaction, how far it grew, or what's next. Cycles with `tap`. */
export function tapLine(c: TalkContext, tap: number): TalkLine {
  switch (tap % 4) {
    case 1:
      return c.nextName ? { key: 'talk.tapNext', params: { stage: c.stageName, next: c.nextName }, plural: c.toNext } : { key: 'talk.tapFull' };
    case 3:
      return c.days > 0 ? { key: 'talk.tapDays', plural: c.days } : line('tap', tap);
    default:
      return line('tap', tap);
  }
}
