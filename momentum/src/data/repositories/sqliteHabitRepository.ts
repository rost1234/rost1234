import { guardDb } from '@/core/errors';
import { createId, nowIso } from '@/core/id';
import type { Habit, NewHabit } from '@/domain/models';
import { mapHabit, serializeWeekdays, toSqlBoolean } from '../db/mappers';
import type { HabitRow } from '../db/rows';
import type { ExecutorProvider, HabitRepository, SqlExecutor } from './types';

type ColumnValue = string | number | null;

/** Maps domain fields to their column + serialized value. */
function toColumns(changes: Partial<NewHabit>): [string, ColumnValue][] {
  const columns: [string, ColumnValue][] = [];
  if (changes.title !== undefined) columns.push(['title', changes.title.trim()]);
  if (changes.microStep !== undefined) columns.push(['micro_step', changes.microStep.trim()]);
  if (changes.isQuantitative !== undefined) columns.push(['is_quantitative', toSqlBoolean(changes.isQuantitative)]);
  if (changes.targetCount !== undefined) columns.push(['target_count', Math.max(1, Math.trunc(changes.targetCount))]);
  if (changes.unit !== undefined) columns.push(['unit', changes.unit.trim()]);
  if (changes.targetFrequency !== undefined) columns.push(['target_frequency', changes.targetFrequency]);
  if (changes.targetDays !== undefined) columns.push(['target_days', serializeWeekdays(changes.targetDays)]);
  if (changes.why !== undefined) columns.push(['why', changes.why.trim()]);
  if (changes.growthMode !== undefined) columns.push(['growth_mode', changes.growthMode]);
  if (changes.goalCount !== undefined) columns.push(['goal_count', changes.goalCount === null ? null : Math.max(1, Math.trunc(changes.goalCount))]);
  if (changes.levelStep !== undefined) columns.push(['level_step', changes.levelStep === null ? null : Math.max(1, Math.trunc(changes.levelStep))]);
  if (changes.levelSnoozeUntil !== undefined) columns.push(['level_snooze_until', changes.levelSnoozeUntil]);
  if (changes.cue !== undefined) columns.push(['cue', changes.cue.trim()]);
  if (changes.pairing !== undefined) columns.push(['pairing', changes.pairing.trim()]);
  if (changes.afterHabitId !== undefined) columns.push(['after_habit_id', changes.afterHabitId]);
  if (changes.timeOfDay !== undefined) columns.push(['time_of_day', changes.timeOfDay]);
  if (changes.reminder !== undefined) columns.push(['reminder', changes.reminder]);
  return columns;
}

async function insertHabit(db: SqlExecutor, input: NewHabit): Promise<Habit> {
  const habit: Habit = {
    why: '',
    growthMode: 'maintain',
    goalCount: null,
    levelStep: null,
    levelSnoozeUntil: null,
    cue: '',
    pairing: '',
    afterHabitId: null,
    timeOfDay: 'any',
    reminder: 'off',
    ...input,
    title: input.title.trim(),
    microStep: input.microStep.trim(),
    unit: input.unit.trim(),
    targetCount: input.isQuantitative ? Math.max(1, Math.trunc(input.targetCount)) : 1,
    id: createId(),
    createdAt: nowIso(),
    isArchived: false,
  };
  await db.runAsync(
    `INSERT INTO habits (id, title, micro_step, is_quantitative, target_count, unit, target_frequency, target_days, created_at, is_archived)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      habit.id,
      habit.title,
      habit.microStep,
      toSqlBoolean(habit.isQuantitative),
      habit.targetCount,
      habit.unit,
      habit.targetFrequency,
      serializeWeekdays(habit.targetDays),
      habit.createdAt,
    ],
  );
  // Optional Atomic-Habits fields share the update path (single source of column mapping).
  const extras = toColumns({
    why: habit.why,
    growthMode: habit.growthMode,
    goalCount: habit.goalCount,
    levelStep: habit.levelStep,
    levelSnoozeUntil: habit.levelSnoozeUntil,
    cue: habit.cue,
    pairing: habit.pairing,
    afterHabitId: habit.afterHabitId,
    timeOfDay: habit.timeOfDay,
    reminder: habit.reminder,
  });
  await db.runAsync(`UPDATE habits SET ${extras.map(([c]) => `${c} = ?`).join(', ')} WHERE id = ?`, [
    ...extras.map(([, v]) => v),
    habit.id,
  ]);
  return { ...habit, why: habit.why.trim(), cue: habit.cue.trim(), pairing: habit.pairing.trim() };
}

export class SqliteHabitRepository implements HabitRepository {
  constructor(private readonly db: ExecutorProvider) {}

  getAll(options: { includeArchived?: boolean } = {}): Promise<Habit[]> {
    return guardDb('habits.getAll', async () => {
      const db = await this.db();
      const sql = options.includeArchived
        ? 'SELECT * FROM habits ORDER BY created_at ASC'
        : 'SELECT * FROM habits WHERE is_archived = 0 ORDER BY created_at ASC';
      const rows = await db.getAllAsync<HabitRow>(sql);
      return rows.map(mapHabit);
    });
  }

  getById(id: string): Promise<Habit | null> {
    return guardDb('habits.getById', async () => {
      const db = await this.db();
      const row = await db.getFirstAsync<HabitRow>('SELECT * FROM habits WHERE id = ?', [id]);
      return row ? mapHabit(row) : null;
    });
  }

  create(input: NewHabit): Promise<Habit> {
    return guardDb('habits.create', async () => insertHabit(await this.db(), input));
  }

  /** Caller is expected to wrap this in a transaction for atomicity. */
  createMany(inputs: readonly NewHabit[]): Promise<Habit[]> {
    return guardDb('habits.createMany', async () => {
      const db = await this.db();
      const created: Habit[] = [];
      for (const input of inputs) {
        created.push(await insertHabit(db, input));
      }
      return created;
    });
  }

  update(id: string, changes: Partial<NewHabit>): Promise<void> {
    return guardDb('habits.update', async () => {
      const columns = toColumns(changes);
      if (columns.length === 0) return;
      const db = await this.db();
      const assignments = columns.map(([column]) => `${column} = ?`).join(', ');
      await db.runAsync(`UPDATE habits SET ${assignments} WHERE id = ?`, [...columns.map(([, value]) => value), id]);
    });
  }

  setArchived(id: string, archived: boolean): Promise<void> {
    return guardDb('habits.setArchived', async () => {
      const db = await this.db();
      await db.runAsync('UPDATE habits SET is_archived = ? WHERE id = ?', [toSqlBoolean(archived), id]);
    });
  }

  delete(id: string): Promise<void> {
    return guardDb('habits.delete', async () => {
      const db = await this.db();
      await db.runAsync('DELETE FROM habits WHERE id = ?', [id]);
    });
  }
}
