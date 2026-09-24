import { guardDb } from '@/core/errors';
import { createId, nowIso } from '@/core/id';
import type { LocalDateString } from '@/core/localDate';
import type { NewTask, Task } from '@/domain/models';
import { mapTask } from '../db/mappers';
import type { TaskRow } from '../db/rows';
import type { ExecutorProvider, TaskRepository } from './types';

export class SqliteTaskRepository implements TaskRepository {
  constructor(private readonly db: ExecutorProvider) {}

  getForDate(date: LocalDateString): Promise<Task[]> {
    return guardDb('tasks.getForDate', async () => {
      const db = await this.db();
      const rows = await db.getAllAsync<TaskRow>(
        `SELECT * FROM tasks
         WHERE (is_completed = 0 AND (due_date IS NULL OR due_date <= ?))
            OR (is_completed = 1 AND due_date = ?)
         ORDER BY is_completed ASC, created_at ASC`,
        [date, date],
      );
      return rows.map(mapTask);
    });
  }

  getAll(): Promise<Task[]> {
    return guardDb('tasks.getAll', async () => {
      const db = await this.db();
      const rows = await db.getAllAsync<TaskRow>('SELECT * FROM tasks ORDER BY created_at ASC');
      return rows.map(mapTask);
    });
  }

  create(input: NewTask): Promise<Task> {
    return guardDb('tasks.create', async () => {
      const db = await this.db();
      const task: Task = {
        id: createId(),
        habitId: input.habitId,
        title: input.title.trim(),
        isCompleted: false,
        dueDate: input.dueDate,
        createdAt: nowIso(),
      };
      await db.runAsync(
        'INSERT INTO tasks (id, habit_id, title, is_completed, due_date, created_at) VALUES (?, ?, ?, 0, ?, ?)',
        [task.id, task.habitId, task.title, task.dueDate, task.createdAt],
      );
      return task;
    });
  }

  setCompleted(id: string, completed: boolean, on: LocalDateString): Promise<void> {
    return guardDb('tasks.setCompleted', async () => {
      const db = await this.db();
      if (completed) {
        // Re-date completed tasks so they stay visible (checked) on the day they were done.
        await db.runAsync('UPDATE tasks SET is_completed = 1, due_date = ? WHERE id = ?', [on, id]);
      } else {
        await db.runAsync('UPDATE tasks SET is_completed = 0 WHERE id = ?', [id]);
      }
    });
  }

  rename(id: string, title: string): Promise<void> {
    return guardDb('tasks.rename', async () => {
      const db = await this.db();
      await db.runAsync('UPDATE tasks SET title = ? WHERE id = ?', [title.trim(), id]);
    });
  }

  delete(id: string): Promise<void> {
    return guardDb('tasks.delete', async () => {
      const db = await this.db();
      await db.runAsync('DELETE FROM tasks WHERE id = ?', [id]);
    });
  }
}
