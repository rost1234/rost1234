import { getLocalDeviceDate } from '@/core/localDate';
import { repositories } from '@/data/repositories';
import { applyPrimaryAction, progressOf } from '@/domain/habitProgress';
import { isHabitDueOn } from '@/domain/habitSchedule';
import { buildTodayWidgetModel, type TodayWidgetModel } from './widgetModel';

/** Reads today's state straight from SQLite (works without the app UI running). */
export async function loadTodayWidgetModel(maxRows: number): Promise<TodayWidgetModel> {
  const today = getLocalDeviceDate();
  const [settings, habits, logs] = await Promise.all([
    repositories.settings.get(),
    repositories.habits.getAll(),
    repositories.habitLogs.getForDate(today),
  ]);
  return buildTodayWidgetModel(habits, logs, today, maxRows, settings.isOnboardingCompleted);
}

/** Same rule as a tap in the app: +1 for count habits, toggle for binary ones. */
export async function tapHabitFromWidget(habitId: string): Promise<void> {
  const today = getLocalDeviceDate();
  const habit = await repositories.habits.getById(habitId);
  if (!habit || habit.isArchived || !isHabitDueOn(habit, today)) return;
  const log = (await repositories.habitLogs.getForDate(today)).find((l) => l.habitId === habitId);
  const progress = progressOf(log);
  // Same low-energy-day rule as the app: the tiny step completes the habit.
  const minimumDay = (await repositories.dayModes.get(today)) === 'minimum';
  const next =
    minimumDay && progress.status !== 'completed'
      ? { currentCount: Math.max(1, progress.currentCount), status: 'completed' as const }
      : applyPrimaryAction(habit, progress);
  await repositories.habitLogs.upsert({ habitId, logDate: today, currentCount: next.currentCount, status: next.status });
}
