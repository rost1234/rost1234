import type { Insight } from '@/content/insightSchema';
import type { LocalDateString } from '@/core/localDate';
import type { TellReason, ToldNote } from '@/state/notebookStore';

/** One card in the notebook: when it was told and why (unknown after a restore: just the date). */
export interface NotebookEntry {
  insight: Insight;
  date: LocalDateString;
  reason: TellReason | null;
}

/**
 * The cards told so far, newest first. `shown` (the database) has every card and its last date;
 * the per-device notes add why it was told, when they're about that same day.
 */
export function toldEntries(
  insights: readonly Insight[],
  shown: Readonly<Record<string, LocalDateString>>,
  notes: Readonly<Record<string, ToldNote>>,
): NotebookEntry[] {
  return insights
    .filter((insight) => shown[insight.id] !== undefined)
    .map((insight) => {
      const date = shown[insight.id] as LocalDateString;
      const note = notes[insight.id];
      return { insight, date, reason: note?.date === date ? note.reason : null };
    })
    .sort((a, b) => b.date.localeCompare(a.date) || a.insight.id.localeCompare(b.insight.id));
}

/** Entries split into days, in the order given. */
export function byDay(entries: readonly NotebookEntry[]): { date: LocalDateString; entries: NotebookEntry[] }[] {
  const days: { date: LocalDateString; entries: NotebookEntry[] }[] = [];
  for (const entry of entries) {
    const last = days[days.length - 1];
    if (last?.date === entry.date) last.entries.push(entry);
    else days.push({ date: entry.date, entries: [entry] });
  }
  return days;
}
