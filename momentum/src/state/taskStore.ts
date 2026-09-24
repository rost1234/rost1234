import { create } from 'zustand';
import { runDetached, toErrorMessage } from '@/core/errors';
import { createId } from '@/core/id';
import type { LocalDateString } from '@/core/localDate';
import { repositories } from '@/data/repositories';
import type { Task } from '@/domain/models';
import { hasRoomToday, placementForNewTask } from '@/domain/taskPlanning';
import { t } from '@/i18n';

/** Where a task lives relative to today. */
type Bucket = 'today' | 'overdue' | 'later';

export type TaskDecision = 'today' | 'later' | 'drop';

interface TaskState {
  today: LocalDateString | null;
  /** Planned for today (open and done). */
  tasks: Task[];
  /** Open tasks from previous days awaiting a decision. */
  overdue: Task[];
  /** Open, undated tasks. */
  later: Task[];
  isLoaded: boolean;
  error: string | null;

  load: (today: LocalDateString) => Promise<void>;
  /** Adds to today while there's room (max 3 open), otherwise to Later. Returns where it went. */
  addTask: (title: string) => 'today' | 'later' | null;
  toggleTask: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
  /** Moves a task from any list to today / Later, or drops it. */
  decide: (taskId: string, decision: TaskDecision) => void;
  clearError: () => void;
}

const isPending = (id: string) => id.startsWith('pending-');

export const useTaskStore = create<TaskState>((set, get) => {
  type Lists = Pick<TaskState, 'tasks' | 'overdue' | 'later'>;
  const snapshot = (): Lists => ({ tasks: get().tasks, overdue: get().overdue, later: get().later });
  const rollback = (lists: Lists, message: string) => (error: unknown) =>
    set({ ...lists, error: `${message} ${toErrorMessage(error)}` });

  const findTask = (taskId: string): { task: Task; bucket: Bucket } | null => {
    const { tasks, overdue, later } = get();
    const inToday = tasks.find((t) => t.id === taskId);
    if (inToday) return { task: inToday, bucket: 'today' };
    const inOverdue = overdue.find((t) => t.id === taskId);
    if (inOverdue) return { task: inOverdue, bucket: 'overdue' };
    const inLater = later.find((t) => t.id === taskId);
    return inLater ? { task: inLater, bucket: 'later' } : null;
  };

  const without = (taskId: string): Lists => ({
    tasks: get().tasks.filter((t) => t.id !== taskId),
    overdue: get().overdue.filter((t) => t.id !== taskId),
    later: get().later.filter((t) => t.id !== taskId),
  });

  return {
    today: null,
    tasks: [],
    overdue: [],
    later: [],
    isLoaded: false,
    error: null,

    load: async (today) => {
      set({ today });
      try {
        const [tasks, overdue, later] = await Promise.all([
          repositories.tasks.getForDate(today),
          repositories.tasks.getOverdue(today),
          repositories.tasks.getBacklog(),
        ]);
        if (get().today === today) set({ tasks, overdue, later, isLoaded: true, error: null });
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
      if (!today || !found || isPending(taskId)) return;
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

    clearError: () => set({ error: null }),
  };
});
