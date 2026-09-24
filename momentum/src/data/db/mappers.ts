import type { Weekday } from '@/core/localDate';
import {
  isMoodScore,
  type AppSettings,
  type DailyReflection,
  type FocusSession,
  type Habit,
  type HabitLog,
  type HabitLogStatus,
  type Task,
  type TargetFrequency,
} from '@/domain/models';
import type {
  AppSettingsRow,
  DailyReflectionRow,
  FocusSessionRow,
  HabitLogRow,
  HabitRow,
  SqlBoolean,
  TaskRow,
} from './rows';

export const toSqlBoolean = (value: boolean): SqlBoolean => (value ? 1 : 0);
const fromSqlBoolean = (value: SqlBoolean | number): boolean => value === 1;

const LOG_STATUSES: readonly HabitLogStatus[] = ['in_progress', 'completed', 'skipped', 'forgiven'];

function toLogStatus(value: string): HabitLogStatus {
  const match = LOG_STATUSES.find((status) => status === value);
  return match ?? 'in_progress';
}

function toFrequency(value: string): TargetFrequency {
  return value === 'specific_days' ? 'specific_days' : 'daily';
}

function isWeekday(value: unknown): value is Weekday {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 6;
}

export function parseWeekdays(json: string): Weekday[] {
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter(isWeekday) : [];
  } catch {
    return [];
  }
}

export const serializeWeekdays = (days: readonly Weekday[]): string =>
  JSON.stringify([...new Set(days)].sort((a, b) => a - b));

export const mapSettings = (row: AppSettingsRow): AppSettings => ({
  id: row.id,
  isOnboardingCompleted: fromSqlBoolean(row.is_onboarding_completed),
  streakFreezesAvailable: row.streak_freezes_available,
  createdAt: row.created_at,
  lastFreezeAwardDate: row.last_freeze_award_date ?? null,
  reflectionReminderMinutes: row.reflection_reminder_minutes ?? null,
});

export const mapHabit = (row: HabitRow): Habit => ({
  id: row.id,
  title: row.title,
  microStep: row.micro_step,
  isQuantitative: fromSqlBoolean(row.is_quantitative),
  targetCount: Math.max(1, row.target_count),
  unit: row.unit,
  targetFrequency: toFrequency(row.target_frequency),
  targetDays: parseWeekdays(row.target_days),
  createdAt: row.created_at,
  isArchived: fromSqlBoolean(row.is_archived),
});

export const mapHabitLog = (row: HabitLogRow): HabitLog => ({
  id: row.id,
  habitId: row.habit_id,
  logDate: row.log_date,
  currentCount: row.current_count,
  status: toLogStatus(row.status),
  updatedAt: row.updated_at,
});

export const mapTask = (row: TaskRow): Task => ({
  id: row.id,
  habitId: row.habit_id,
  title: row.title,
  isCompleted: fromSqlBoolean(row.is_completed),
  dueDate: row.due_date,
  createdAt: row.created_at,
});

export const mapFocusSession = (row: FocusSessionRow): FocusSession => ({
  id: row.id,
  habitId: row.habit_id,
  taskId: row.task_id,
  startTime: row.start_time,
  endTime: row.end_time,
  durationMinutes: row.duration_minutes,
  createdAt: row.created_at,
});

export const mapReflection = (row: DailyReflectionRow): DailyReflection => ({
  id: row.id,
  logDate: row.log_date,
  moodScore: isMoodScore(row.mood_score) ? row.mood_score : 3,
  gratitudeText: row.gratitude_text,
  lessonText: row.lesson_text,
  createdAt: row.created_at,
});
