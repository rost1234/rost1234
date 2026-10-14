import { create } from 'zustand';
import { runDetached, toErrorMessage } from '@/core/errors';
import { createId } from '@/core/id';
import { addDays, type LocalDateString } from '@/core/localDate';
import { repositories } from '@/data/repositories';
import type { Task } from '@/domain/models';
import { hasRoomToday, placementForNewTask } from '@/domain/taskPlanning';
import { t } from '@/i18n';

/** Where a task lives relative to today. */
type Bucket = 'today' | 'overdue' | 'later' | 'upcoming';

/** How far ahead "Coming up" looks. */
export const UPCOMING_DAYS = 7;

const isUpcoming = (date: LocalDateString | null, today: LocalDateString) => date !== null && date > today && date <= addDays(today, UPCOMING_DAYS);

export type TaskDecision = 'today' | 'later' | 'drop';

interface TaskState {
  today: LocalDateString | null;
  /** Planned for today (open and done). */
  tasks: Task[];
  /** Open tasks from previous days awaiting a decision. */
  overdue: Task[];
  /** Open, undated tasks. */
  later: Task[];
  /** Open tasks planned for the coming week (after today), soonest first. */
  upcoming: Task[];
  isLoaded: boolean;
  error: string | null;

  load: (today: LocalDateString) => Promise<void>;
  /** Adds to today while there's room (max 3 open), otherwise to Later. Returns where it went. */
  addTask: (title: string) => 'today' | 'later' | null;
  toggleTask: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
  /** Moves a task from any list (the coming week's too) to today / Later, or drops it. */
  decide: (taskId: string, decision: TaskDecision) => void;
  /**
   * Plans a new task for a day after today (it shows up on that day). `'full'` when that day already
   * has its three open tasks; `null` when it couldn't be saved (the caller says so).
   */
  planTask: (title: string, date: LocalDateString) => Promise<Task | 'full' | null>;
  /** Moves a task to a day after today. */
  moveToDate: (taskId: string, date: LocalDateString) => void;
  clearError: () => void;
}

const isPending = (id: string) => id.startsWith('pending-');

export const useTaskStore = create<TaskState>((set, get) => {
  type Lists = Pick<TaskState, 'tasks' | 'overdue' | 'later' | 'upcoming'>;
  const snapshot = (): Lists => ({ tasks: get().tasks, overdue: get().overdue, later: get().later, upcoming: get().upcoming });
  // Soonest first, then in the order they were added.
  const byDay = (list: Task[]) => [...list].sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '') || a.createdAt.localeCompare(b.createdAt));
  const rollback = (lists: Lists, message: string) => (error: unknown) =>
    set({ ...lists, error: `${message} ${toErrorMessage(error)}` });

  const findTask = (taskId: string): { task: Task; bucket: Bucket } | null => {
    const { tasks, overdue, later } = get();
    const inToday = tasks.find((t) => t.id === taskId);
    if (inToday) return { task: inToday, bucket: 'today' };
    const inOverdue = overdue.find((t) => t.id === taskId);
    if (inOverdue) return { task: inOverdue, bucket: 'overdue' };
    const inLater = later.find((t) => t.id === taskId);
    if (inLater) return { task: inLater, bucket: 'later' };
    const inUpcoming = get().upcoming.find((t) => t.id === taskId);
    return inUpcoming ? { task: inUpcoming, bucket: 'upcoming' } : null;
  };

  const without = (taskId: string): Lists => ({
    tasks: get().tasks.filter((t) => t.id !== taskId),
    overdue: get().overdue.filter((t) => t.id !== taskId),
    later: get().later.filter((t) => t.id !== taskId),
    upcoming: get().upcoming.filter((t) => t.id !== taskId),
  });

  return {
    today: null,
    tasks: [],
    overdue: [],
    later: [],
    upcoming: [],
    isLoaded: false,
    error: null,

    load: async (today) => {
      set({ today });
      try {
        const [tasks, overdue, later, upcoming] = await Promise.all([
          repositories.tasks.getForDate(today),
          repositories.tasks.getOverdue(today),
          repositories.tasks.getBacklog(),
          repositories.tasks.getUpcoming(today, addDays(today, UPCOMING_DAYS)),
        ]);
        if (get().today === today) set({ tasks, overdue, later, upcoming, isLoaded: true, error: null });
      } catch (error) {
        set({ isLoaded: true, error: toErrorMessage(error) });
      }
    },

    addTask: (title) => {
      const { today } = get();
      const trimmed = title.trim();
      if (!today || trimmed.length === 0) return null;
      const dueDate = placementForNewTask(get().tasks, today);
      const placeholder: Task = {
        id: `pending-${createId()}`,
        habitId: null,
        title: trimmed,
        isCompleted: false,
        dueDate,
        createdAt: new Date().toISOString(),
      };
      const before = snapshot();
      const key = dueDate ? 'tasks' : 'later';
      set({ [key]: [...get()[key], placeholder] });
      runDetached(
        repositories.tasks.create({ title: trimmed, habitId: null, dueDate }).then((saved) => {
          set({ [key]: get()[key].map((t) => (t.id === placeholder.id ? saved : t)) });
        }),
        rollback(before, t('err.addTask')),
      );
      return dueDate ? 'today' : 'later';
    },

    toggleTask: (taskId) => {
      const { today, tasks } = get();
      const task = tasks.find((t) => t.id === taskId);
      if (!today || !task || isPending(task.id)) return;
      const isCompleted = !task.isCompleted;
      // Re-opening a task must respect the daily cap.
      if (!isCompleted && !hasRoomToday(tasks, today)) {
        set({ error: t('err.todayFull') });
        return;
      }
      const before = snapshot();
      set({ tasks: tasks.map((t) => (t.id === taskId ? { ...t, isCompleted } : t)) });
      runDetached(repositories.tasks.setCompleted(taskId, isCompleted, today), rollback(before, t('err.updateTask')));
    },

    deleteTask: (taskId) => get().decide(taskId, 'drop'),

    decide: (taskId, decision) => {
      const { today } = get();
      const found = findTask(taskId);
      if (!today || isPending(taskId)) return;
      // Planned further ahead than the lists reach (e.g. from the reflection): drop it all the same.
      if (!found) {
        if (decision === 'drop') runDetached(repositories.tasks.delete(taskId), rollback(snapshot(), t('err.dropTask')));
        return;
      }
      if (decision === 'today' && found.bucket !== 'today' && !hasRoomToday(get().tasks, today)) {
        set({ error: t('err.todayFull') });
        return;
      }
      const before = snapshot();
      const rest = without(taskId);

      if (decision === 'drop') {
        set(rest);
        runDetached(repositories.tasks.delete(taskId), rollback(before, t('err.dropTask')));
        return;
      }
      const dueDate = decision === 'today' ? today : null;
      const moved: Task = { ...found.task, dueDate };
      set(decision === 'today' ? { ...rest, tasks: [...rest.tasks, moved] } : { ...rest, later: [...rest.later, moved] });
      runDetached(repositories.tasks.setDueDate(taskId, dueDate), rollback(before, t('err.moveTask')));
    },

    planTask: async (title, date) => {
      const { today } = get();
      const trimmed = title.trim();
      // ">= today": a reflection finished after midnight plans "tomorrow", which is now today.
      if (!today || trimmed.length === 0 || date < today) return null;
      try {
        // Every day keeps its three-task limit, a planned one too.
        const onDay = date === today ? get().tasks : await repositories.tasks.getForDate(date);
        if (!hasRoomToday(onDay, date)) return 'full';
        const task = await repositories.tasks.create({ title: trimmed, habitId: null, dueDate: date });
        if (date === today) set({ tasks: [...get().tasks, task] });
        else if (isUpcoming(date, today)) set({ upcoming: byDay([...get().upcoming, task]) });
        return task;
      } catch {
        return null;
      }
    },

    moveToDate: (taskId, date) => {
      const { today } = get();
      const found = findTask(taskId);
      if (!today || !found || isPending(taskId) || date <= today) return;
      if (isUpcoming(date, today) && found.task.dueDate !== date && !hasRoomToday(get().upcoming, date)) {
        set({ error: t('err.dayFull') });
        return;
      }
      const before = snapshot();
      const rest = without(taskId);
      set(isUpcoming(date, today) ? { ...rest, upcoming: byDay([...rest.upcoming, { ...found.task, dueDate: date }]) } : rest);
      runDetached(repositories.tasks.setDueDate(taskId, date), rollback(before, t('err.moveTask')));
    },

    clearError: () => set({ error: null }),
  };
});
