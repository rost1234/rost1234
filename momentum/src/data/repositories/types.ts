import type { SQLiteDatabase } from 'expo-sqlite';
import type { LocalDateString } from '@/core/localDate';
import type {
  AppSettings,
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
import type { TableName } from '../db/schema';

/** The subset of the SQLite API repositories rely on (db or transaction). */
export type SqlExecutor = Pick<SQLiteDatabase, 'runAsync' | 'getAllAsync' | 'getFirstAsync' | 'execAsync'>;

export type ExecutorProvider = () => Promise<SqlExecutor>;

export interface SettingsRepository {
  get(): Promise<AppSettings>;
  setOnboardingCompleted(completed: boolean): Promise<void>;
  /** Atomically deducts `count` freezes (never below zero); returns the new balance. */
  consumeStreakFreezes(count: number): Promise<number>;
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
  /** Open tasks due on/before `date` (or undated) plus tasks completed on `date`. */
  getForDate(date: LocalDateString): Promise<Task[]>;
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

export type DatabaseSnapshot = Record<TableName, Record<string, unknown>[]>;

export interface BackupRepository {
  exportAll(): Promise<DatabaseSnapshot>;
}
