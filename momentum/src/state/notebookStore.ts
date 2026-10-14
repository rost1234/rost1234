import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { runDetached } from '@/core/errors';
import { isLocalDateString, type LocalDateString } from '@/core/localDate';

const KEY = 'momentum.notebook.v1';

/** Moments when the sprout tells one extra card (at most one a day). */
export const MOMENT_REASONS = ['notToday', 'lowMood', 'focusStopped', 'newHabit'] as const;
export type MomentReason = (typeof MOMENT_REASONS)[number];

/** Why a card was told: the morning's card, a moment, or asked for in the notebook. */
export type TellReason = 'daily' | MomentReason | 'listened';
const REASONS: readonly string[] = ['daily', 'listened', ...MOMENT_REASONS];

export interface ToldNote {
  date: LocalDateString;
  reason: TellReason;
}

/** The day's moment card, waiting in the sprout's bubble until "Thanks". */
export interface Moment {
  id: string;
  date: LocalDateString;
  reason: MomentReason;
  dismissed: boolean;
}

interface NotebookState {
  /** Why and when each card was last told (per device; the dates are also in shown_insights). */
  notes: Record<string, ToldNote>;
  /** Cards starred to keep. */
  saved: string[];
  moment: Moment | null;
  /** The stored copy has been read (until then, today's card isn't picked: it might be a moment's). */
  hydrated: boolean;
  hydrate: () => Promise<void>;
  note: (id: string, date: LocalDateString, reason: TellReason) => void;
  toggleSaved: (id: string) => void;
  setMoment: (moment: Moment) => void;
  dismissMoment: () => void;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function readNotes(raw: unknown): Record<string, ToldNote> {
  if (!isRecord(raw)) return {};
  const notes: Record<string, ToldNote> = {};
  for (const [id, value] of Object.entries(raw)) {
    if (isRecord(value) && typeof value.date === 'string' && isLocalDateString(value.date) && typeof value.reason === 'string' && REASONS.includes(value.reason)) {
      notes[id] = { date: value.date, reason: value.reason as TellReason };
    }
  }
  return notes;
}

function readMoment(raw: unknown): Moment | null {
  if (!isRecord(raw)) return null;
  const { id, date, reason, dismissed } = raw;
  if (typeof id !== 'string' || typeof date !== 'string' || !isLocalDateString(date)) return null;
  if (typeof reason !== 'string' || !(MOMENT_REASONS as readonly string[]).includes(reason)) return null;
  return { id, date, reason: reason as MomentReason, dismissed: dismissed === true };
}

/**
 * The sprout's notebook: which research cards it told, when and why, which ones are starred, and
 * the day's moment card. Kept per device; losing it only drops the stars and the "why" labels.
 */
export const useNotebookStore = create<NotebookState>((set, get) => {
  const persist = () => {
    const { notes, saved, moment } = get();
    runDetached(AsyncStorage.setItem(KEY, JSON.stringify({ notes, saved, moment })));
  };
  return {
    notes: {},
    saved: [],
    moment: null,
    hydrated: false,
    hydrate: async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        if (!isRecord(parsed)) return;
        const saved = Array.isArray(parsed.saved) ? parsed.saved.filter((id): id is string => typeof id === 'string') : [];
        // Anything changed before the stored copy arrived wins.
        set((s) => ({
          notes: { ...readNotes(parsed.notes), ...s.notes },
          saved: [...new Set([...saved, ...s.saved])],
          moment: s.moment ?? readMoment(parsed.moment),
        }));
      } catch {
        // An empty notebook.
      } finally {
        set({ hydrated: true });
      }
    },
    note: (id, date, reason) => {
      const current = get().notes[id];
      if (current?.date === date && current.reason === reason) return;
      // Today's card told for a moment or on request stays labelled that way.
      if (reason === 'daily' && current?.date === date) return;
      set({ notes: { ...get().notes, [id]: { date, reason } } });
      persist();
    },
    toggleSaved: (id) => {
      const saved = get().saved;
      set({ saved: saved.includes(id) ? saved.filter((x) => x !== id) : [...saved, id] });
      persist();
    },
    setMoment: (moment) => {
      set({ moment });
      persist();
    },
    dismissMoment: () => {
      const moment = get().moment;
      if (!moment || moment.dismissed) return;
      set({ moment: { ...moment, dismissed: true } });
      persist();
    },
  };
});

/** Cards told on `date` for a reason other than being that day's own card. */
export function toldTodayNotDaily(notes: Readonly<Record<string, ToldNote>>, date: LocalDateString): Set<string> {
  return new Set(
    Object.entries(notes)
      .filter(([, note]) => note.date === date && note.reason !== 'daily')
      .map(([id]) => id),
  );
}
