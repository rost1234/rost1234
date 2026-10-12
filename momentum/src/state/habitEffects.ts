import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { runDetached } from '@/core/errors';
import { addDays } from '@/core/localDate';
import { repositories } from '@/data/repositories';
import { grewTo, totalChoices, type GrowthStage } from '@/domain/garden';
import { habitStartDate } from '@/domain/habitSchedule';
import type { Habit } from '@/domain/models';
import { crossedMilestone } from '@/domain/rhythm';
import { useHabitStore } from './habitStore';
import { usePrefsStore } from './prefsStore';

const MILESTONES_KEY = 'momentum.milestones.v1';
/** The highest Garden stage already celebrated, so undo and redo don't celebrate twice. */
const GARDEN_KEY = 'momentum.garden.v1';

export interface Celebration {
  /** A streak milestone, the very first completion after setup, or the Garden sprout growing. */
  kind?: 'milestone' | 'firstWin' | 'growth';
  /** Growth: the stage the sprout reached. */
  stage?: GrowthStage;
  habitTitle: string;
  days: number;
  /** Every day it was done, all history: the small choices behind the streak. */
  choices: number;
  /** From the reflection nearest the habit's first day (30+ day milestones): "look where it started". */
  dayOneNote?: { date: string; text: string };
  at: number;
}

/** The current milestone celebration (shown briefly on Today). */
export const useCelebrationStore = create<{ celebration: Celebration | null; dismiss: () => void }>((set) => ({
  celebration: null,
  dismiss: () => set({ celebration: null }),
}));

let celebrated: Record<string, number[]> | null = null;

async function loadCelebrated(): Promise<Record<string, number[]>> {
  if (celebrated) return celebrated;
  try {
    const raw = await AsyncStorage.getItem(MILESTONES_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    celebrated = parsed && typeof parsed === 'object' ? (parsed as Record<string, number[]>) : {};
  } catch {
    celebrated = {};
  }
  return celebrated;
}

/** Gratitude first (it ages best), then the lesson, from a reflection within 3 days of the start. */
async function findDayOneNote(habit: Pick<Habit, 'createdAt'>): Promise<Celebration['dayOneNote']> {
  const start = habitStartDate(habit);
  const reflections = await repositories.reflections.getInRange(start, addDays(start, 3)).catch(() => []);
  for (const r of reflections) {
    const text = r.gratitudeText.trim() || r.lessonText.trim();
    if (text) return { date: r.logDate, text };
  }
  return undefined;
}

async function celebrateOnce(habit: Habit, days: number, choices: number): Promise<void> {
  const seen = await loadCelebrated();
  if (seen[habit.id]?.includes(days)) return;
  seen[habit.id] = [...(seen[habit.id] ?? []), days];
  runDetached(AsyncStorage.setItem(MILESTONES_KEY, JSON.stringify(seen)));
  const dayOneNote = days >= 30 ? await findDayOneNote(habit) : undefined;
  useCelebrationStore.setState({ celebration: { kind: 'milestone', habitTitle: habit.title, days, choices, dayOneNote, at: Date.now() } });
}

let gardenStage: number | null = null;

async function celebrateGrowth(stage: GrowthStage): Promise<void> {
  if (gardenStage === null) {
    try {
      const raw = await AsyncStorage.getItem(GARDEN_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      gardenStage = parsed && typeof parsed === 'object' && typeof (parsed as { stage?: unknown }).stage === 'number' ? (parsed as { stage: number }).stage : -1;
    } catch {
      gardenStage = -1;
    }
  }
  if (stage <= gardenStage) return;
  gardenStage = stage;
  runDetached(AsyncStorage.setItem(GARDEN_KEY, JSON.stringify({ stage })));
  // A streak milestone on the same tap keeps the stage; the grown sprout is on Home anyway.
  if (useCelebrationStore.getState().celebration) return;
  useCelebrationStore.setState({ celebration: { kind: 'growth', stage, habitTitle: '', days: 0, choices: 0, at: Date.now() } });
}

let started = false;

/**
 * Side effects that follow habit state, kept out of the store itself:
 * milestone celebrations. (Reminders follow it too, in `services/notificationPlanner`.)
 */
export function startHabitEffects(): void {
  if (started) return;
  started = true;
  useHabitStore.subscribe((state, prev) => {
    const today = state.today;
    if (!today) return;

    // Streak went up on the same day → maybe a milestone.
    if (state.today === prev.today && state.status === 'ready') {
      for (const habit of state.habits) {
        const before = prev.streaks[habit.id] ?? 0;
        const after = state.streaks[habit.id] ?? 0;
        const milestone = crossedMilestone(before, after);
        if (milestone) runDetached(celebrateOnce(habit, milestone, (state.completedBefore[habit.id] ?? 0) + 1));
      }
    }

    // Garden: a habit marked done today grew the sprout to its next stage.
    if (state.today === prev.today && state.status === 'ready' && prev.status === 'ready' && usePrefsStore.getState().look === 'garden') {
      const stage = grewTo(totalChoices(prev.completedBefore, prev.logs, today), totalChoices(state.completedBefore, state.logs, today));
      if (stage !== null) runDetached(celebrateGrowth(stage));
    }
  });
}
