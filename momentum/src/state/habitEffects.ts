import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { runDetached } from '@/core/errors';
import { crossedMilestone } from '@/domain/rhythm';
import { cancelTodaysReminder, syncHabitReminders } from '@/services/habitReminders';
import { useHabitStore } from './habitStore';

const MILESTONES_KEY = 'momentum.milestones.v1';

export interface Celebration {
  habitTitle: string;
  days: number;
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

async function celebrateOnce(habitId: string, habitTitle: string, days: number): Promise<void> {
  const seen = await loadCelebrated();
  if (seen[habitId]?.includes(days)) return;
  seen[habitId] = [...(seen[habitId] ?? []), days];
  runDetached(AsyncStorage.setItem(MILESTONES_KEY, JSON.stringify(seen)));
  useCelebrationStore.setState({ celebration: { habitTitle, days, at: Date.now() } });
}

let started = false;
let syncTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Side effects that follow habit state, kept out of the store itself:
 * milestone celebrations, cancelling today's reminder once done, and
 * (debounced) re-syncing smart reminders when habits change or load.
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
        if (milestone) runDetached(celebrateOnce(habit.id, habit.title, milestone));
      }
    }

    // Completed today → no reminder needed any more today.
    for (const habitId of Object.keys(state.logs)) {
      const now = state.logs[habitId]?.[today]?.status;
      const was = prev.logs[habitId]?.[today]?.status;
      if (now === 'completed' && was !== 'completed') cancelTodaysReminder(habitId, today);
    }

    // Habits loaded or edited → re-plan smart reminders (debounced).
    if (state.habits !== prev.habits || (state.status === 'ready' && prev.status !== 'ready')) {
      if (syncTimer) clearTimeout(syncTimer);
      syncTimer = setTimeout(() => {
        const s = useHabitStore.getState();
        if (s.today) runDetached(syncHabitReminders(s.habits, s.logs, s.today));
      }, 1500);
    }
  });
}
