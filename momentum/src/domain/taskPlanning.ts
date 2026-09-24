import type { LocalDateString } from '@/core/localDate';
import type { Task } from './models';

/** Like a sticky note: at most three open tasks on today's list. */
export const MAX_OPEN_TASKS_PER_DAY = 3;

export function openTasksOn(tasks: readonly Task[], date: LocalDateString): number {
  return tasks.filter((task) => !task.isCompleted && task.dueDate === date).length;
}

export function hasRoomToday(tasks: readonly Task[], date: LocalDateString): boolean {
  return openTasksOn(tasks, date) < MAX_OPEN_TASKS_PER_DAY;
}

/** Where a newly added task lands: today while there is room, otherwise Later. */
export function placementForNewTask(tasks: readonly Task[], today: LocalDateString): LocalDateString | null {
  return hasRoomToday(tasks, today) ? today : null;
}
