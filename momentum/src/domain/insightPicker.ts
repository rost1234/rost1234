import type { LocalDateString } from '@/core/localDate';

export type InsightTriggerId = 'new_habit' | 'streak_broken' | 'perfect_week' | 'low_mood' | 'missed_focus';

export interface PickableInsight {
  id: string;
  goals: readonly string[];
  triggers: readonly string[];
}

/** Small deterministic hash so the same day always shows the same card. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * One insight a day:
 * 1. prefer cards matching what is happening now (active triggers),
 * 2. then cards for the user's goal (or general ones),
 * 3. never repeat a card until every card has been seen (then the oldest first),
 * 4. stable for the whole day (deterministic by date).
 */
export function pickInsight<T extends PickableInsight>(
  insights: readonly T[],
  date: LocalDateString,
  goal: string | null,
  activeTriggers: readonly InsightTriggerId[],
  shown: Readonly<Record<string, LocalDateString>>,
): T | null {
  if (insights.length === 0) return null;

  // Already picked today? Keep it.
  const today = insights.find((i) => shown[i.id] === date);
  if (today) return today;

  const unseen = insights.filter((i) => shown[i.id] === undefined);
  const pool =
    unseen.length > 0
      ? unseen
      : // Everything seen: recycle, least recently shown first.
        [...insights].sort((a, b) => (shown[a.id] ?? '').localeCompare(shown[b.id] ?? '')).slice(0, Math.max(1, Math.ceil(insights.length / 3)));

  const score = (i: T) =>
    (i.triggers.some((t) => activeTriggers.includes(t as InsightTriggerId)) ? 2 : 0) +
    (goal && i.goals.includes(goal) ? 1 : i.goals.length === 0 ? 0.5 : 0);
  const best = Math.max(...pool.map(score));
  const candidates = pool.filter((i) => score(i) === best).sort((a, b) => a.id.localeCompare(b.id));
  return candidates[hash(date) % candidates.length] ?? null;
}
