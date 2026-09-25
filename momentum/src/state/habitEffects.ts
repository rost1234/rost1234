import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { runDetached } from '@/core/errors';
import { crossedMilestone } from '@/domain/rhythm';
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
        if (milestone) runDetached(celebrateOnce(habit.id, habit.title, milestone));
      }
    }
  });
}
