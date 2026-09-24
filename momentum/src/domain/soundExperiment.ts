import type { FocusSession } from './models';

/** Sessions per group before we say anything at all. */
export const MIN_SESSIONS_PER_GROUP = 5;

export interface SessionGroupStats {
  sessions: number;
  averageMinutes: number;
  /** Share of sessions that ran to their planned end, 0–1. */
  completionRate: number;
}

export interface SoundExperiment {
  withSound: SessionGroupStats;
  silence: SessionGroupStats;
  /** Both groups have enough sessions for a (rough) comparison. */
  enoughData: boolean;
  /** The single sound mix used most often, if any. */
  favoriteSound: string | null;
}

function stats(sessions: readonly FocusSession[]): SessionGroupStats {
  if (sessions.length === 0) return { sessions: 0, averageMinutes: 0, completionRate: 0 };
  const minutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const completed = sessions.filter((s) => s.completed).length;
  return {
    sessions: sessions.length,
    averageMinutes: Math.round(minutes / sessions.length),
    completionRate: completed / sessions.length,
  };
}

/**
 * Personal experiment: does background sound help *you*? Only sessions logged
 * with the experiment fields (v7+) count, since older ones don't know what played.
 */
export function compareSoundSessions(sessions: readonly FocusSession[]): SoundExperiment {
  const tracked = sessions.filter((s) => s.completed !== null);
  const withSound = tracked.filter((s) => s.soundId);
  const silence = tracked.filter((s) => !s.soundId);

  const counts = new Map<string, number>();
  for (const s of withSound) counts.set(s.soundId!, (counts.get(s.soundId!) ?? 0) + 1);
  let favoriteSound: string | null = null;
  for (const [id, count] of counts) {
    if (favoriteSound === null || count > counts.get(favoriteSound)!) favoriteSound = id;
  }

  return {
    withSound: stats(withSound),
    silence: stats(silence),
    enoughData: withSound.length >= MIN_SESSIONS_PER_GROUP && silence.length >= MIN_SESSIONS_PER_GROUP,
    favoriteSound,
  };
}
