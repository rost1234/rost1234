import type { SQLiteDatabase } from 'expo-sqlite';
import type { LocalDateString } from '@/core/localDate';
import type {
  AppSettings,
  DailyUsage,
  DailyReflection,
  FocusSession,
  Habit,
  HabitLog,
  HabitLogStatus,
  NewFocusSession,
  NewHabit,
  NewTask,
  ReflectionInput,
  Task,
} from '@/domain/models';
import type { BackupTables } from '../backup/backupFormat';
import type { TableName } from '../db/schema';

/** The subset of the SQLite API repositories rely on (db or transaction). */
export type SqlExecutor = Pick<SQLiteDatabase, 'runAsync' | 'getAllAsync' | 'getFirstAsync' | 'execAsync'>;

export type ExecutorProvider = () => Promise<SqlExecutor>;

export interface SettingsRepository {
  get(): Promise<AppSettings>;
  setOnboardingCompleted(completed: boolean): Promise<void>;
  /** Atomically deducts `count` freezes (never below zero); returns the new balance. */
  consumeStreakFreezes(count: number): Promise<number>;
  /** +1 freeze (capped at `max`) and records the award date; returns the new balance. */
  awardStreakFreeze(on: LocalDateString, max: number): Promise<number>;
  /** Minutes after midnight (0–1439), or null to turn the reminder off. */
  setReflectionReminder(minutes: number | null): Promise<void>;
}

export interface HabitRepository {
  getAll(options?: { includeArchived?: boolean }): Promise<Habit[]>;
  getById(id: string): Promise<Habit | null>;
  create(input: NewHabit): Promise<Habit>;
  createMany(inputs: readonly NewHabit[]): Promise<Habit[]>;
  update(id: string, changes: Partial<NewHabit>): Promise<void>;
  setArchived(id: string, archived: boolean): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface HabitLogUpsert {
  habitId: string;
  logDate: LocalDateString;
  currentCount: number;
  status: HabitLogStatus;
}

export interface HabitLogRepository {
  getForDate(date: LocalDateString): Promise<HabitLog[]>;
  getInRange(start: LocalDateString, end: LocalDateString): Promise<HabitLog[]>;
  upsert(entry: HabitLogUpsert): Promise<HabitLog>;
  /** Writes `forgiven` logs; existing completed logs are never overwritten. */
  forgive(entries: readonly { habitId: string; logDate: LocalDateString }[]): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface TaskRepository {
  /** Every task (open or done) planned for exactly `date`. */
  getForDate(date: LocalDateString): Promise<Task[]>;
  /** Open tasks planned for a day before `date` — they need a decision. */
  getOverdue(date: LocalDateString): Promise<Task[]>;
  /** Open, undated tasks ("Later"). */
  getBacklog(): Promise<Task[]>;
  /** Plans a task for a day, or `null` to move it to Later. */
  setDueDate(id: string, dueDate: LocalDateString | null): Promise<void>;
  getAll(): Promise<Task[]>;
  create(input: NewTask): Promise<Task>;
  /** Completing a task re-dates it to `on` so it stays visible that day. */
  setCompleted(id: string, completed: boolean, on: LocalDateString): Promise<void>;
  rename(id: string, title: string): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface FocusSessionRepository {
  create(input: NewFocusSession): Promise<FocusSession>;
  /** Sessions whose `start_time` falls in [startIso, endIso). */
  getInRange(startIso: string, endIso: string): Promise<FocusSession[]>;
  getAll(): Promise<FocusSession[]>;
  delete(id: string): Promise<void>;
}

export interface ReflectionRepository {
  getByDate(date: LocalDateString): Promise<DailyReflection | null>;
  getInRange(start: LocalDateString, end: LocalDateString): Promise<DailyReflection[]>;
  /** Insert or update the single reflection for `input.logDate`. */
  upsert(input: ReflectionInput): Promise<DailyReflection>;
  delete(id: string): Promise<void>;
}

export interface UsageRepository {
  /** Adds foreground seconds to a day's total. */
  addSeconds(date: LocalDateString, seconds: number): Promise<void>;
  getInRange(start: LocalDateString, end: LocalDateString): Promise<DailyUsage[]>;
}

export type DatabaseSnapshot = Record<TableName, Record<string, unknown>[]>;

export interface BackupRepository {
  exportAll(): Promise<DatabaseSnapshot>;
  /** Replaces every table's contents. Must run inside a transaction. */
  replaceAll(tables: BackupTables): Promise<void>;
}
