import { create } from 'zustand';
import { runDetached, toErrorMessage } from '@/core/errors';
import { createId } from '@/core/id';
import type { LocalDateString } from '@/core/localDate';
import { repositories } from '@/data/repositories';
import type { Task } from '@/domain/models';

interface TaskState {
  today: LocalDateString | null;
  tasks: Task[];
  isLoaded: boolean;
  error: string | null;
  load: (today: LocalDateString) => Promise<void>;
  addTask: (title: string) => void;
  toggleTask: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
}

export const useTaskStore = create<TaskState>((set, get) => {
  const rollback = (snapshot: Task[], message: string) => (error: unknown) =>
    set({ tasks: snapshot, error: `${message} ${toErrorMessage(error)}` });

  return {
    today: null,
    tasks: [],
    isLoaded: false,
    error: null,

    load: async (today) => {
      set({ today });
      try {
        const tasks = await repositories.tasks.getForDate(today);
        if (get().today === today) set({ tasks, isLoaded: true, error: null });
      } catch (error) {
        set({ isLoaded: true, error: toErrorMessage(error) });
      }
    },

    addTask: (title) => {
      const { today, tasks } = get();
      const trimmed = title.trim();
      if (!today || trimmed.length === 0) return;
      const placeholder: Task = {
        id: `pending-${createId()}`,
        habitId: null,
        title: trimmed,
        isCompleted: false,
        dueDate: today,
        createdAt: new Date().toISOString(),
      };
      set({ tasks: [...tasks, placeholder] });
      runDetached(
        repositories.tasks.create({ title: trimmed, habitId: null, dueDate: today }).then((saved) => {
          set({ tasks: get().tasks.map((t) => (t.id === placeholder.id ? saved : t)) });
        }),
        rollback(tasks, "Couldn't add task."),
      );
    },

    toggleTask: (taskId) => {
      const { today, tasks } = get();
      const task = tasks.find((t) => t.id === taskId);
      if (!today || !task || task.id.startsWith('pending-')) return;
      const isCompleted = !task.isCompleted;
      set({
        tasks: tasks.map((t) => (t.id === taskId ? { ...t, isCompleted, dueDate: isCompleted ? today : t.dueDate } : t)),
      });
      runDetached(repositories.tasks.setCompleted(taskId, isCompleted, today), rollback(tasks, "Couldn't update task."));
    },

    deleteTask: (taskId) => {
      const { tasks } = get();
      if (taskId.startsWith('pending-')) return;
      set({ tasks: tasks.filter((t) => t.id !== taskId) });
      runDetached(repositories.tasks.delete(taskId), rollback(tasks, "Couldn't delete task."));
    },
  };
});
