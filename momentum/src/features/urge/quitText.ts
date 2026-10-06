import type { Habit } from '@/domain/models';
import { savedTime, type QuitSavings } from '@/domain/urges';
import type { Translator } from '@/i18n';

/** "After a meal ← wash my face": the if-then plan, or whatever part of it was filled in. */
export function quitPlanText(habit: Pick<Habit, 'cue' | 'microStep'>, t: Translator): string | null {
  const cue = habit.cue.trim();
  const step = habit.microStep.trim();
  if (cue && step) return t('quit.plan', { cue, step });
  return step || cue || null;
}

/** "₪444 · 6 hours" — what the clean days saved, by the user's own estimate. */
export function savingsText(savings: QuitSavings, t: Translator): string {
  const parts: string[] = [];
  if (savings.money !== null) parts.push(t('quit.money', { amount: savings.money.toLocaleString(t.locale) }));
  if (savings.minutes !== null) {
    const time = savedTime(savings.minutes);
    parts.push(t.plural(time.unit === 'hours' ? 'quit.hours' : 'quit.minutes', time.value));
  }
  return parts.join(' · ');
}
