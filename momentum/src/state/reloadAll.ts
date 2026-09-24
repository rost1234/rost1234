import { getLocalDeviceDate } from '@/core/localDate';
import { useAnalyticsStore } from './analyticsStore';
import { useHabitStore } from './habitStore';
import { useReflectionStore } from './reflectionStore';
import { useSettingsStore } from './settingsStore';
import { useTaskStore } from './taskStore';

/** Drops every cached view of the database and reloads it (e.g. after a restore). */
export async function reloadAllData(): Promise<void> {
  const today = getLocalDeviceDate();
  useReflectionStore.setState({ byDate: {} });
  useAnalyticsStore.setState({ data: null });
  useHabitStore.setState({ habits: [], logs: {}, streaks: {}, status: 'idle' });
  await Promise.all([
    useSettingsStore.getState().load(),
    useHabitStore.getState().load(today),
    useTaskStore.getState().load(today),
    useReflectionStore.getState().loadForDate(today),
  ]);
}
