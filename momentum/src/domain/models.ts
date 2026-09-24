import type { LocalDateString, Weekday } from '@/core/localDate';

export type HabitLogStatus = 'in_progress' | 'completed' | 'skipped' | 'forgiven';

/** `daily` = every day; `specific_days` = only the weekdays in `targetDays`. */
export type TargetFrequency = 'daily' | 'specific_days';

export interface AppSettings {
  id: number;
  isOnboardingCompleted: boolean;
  streakFreezesAvailable: number;
  createdAt: string;
}

export interface Habit {
  id: string;
  title: string;
  microStep: string;
  isQuantitative: boolean;
  /** For binary habits this is always 1. */
  targetCount: number;
  unit: string;
  targetFrequency: TargetFrequency;
  targetDays: Weekday[];
  createdAt: string;
  isArchived: boolean;
}

export type NewHabit = Omit<Habit, 'id' | 'createdAt' | 'isArchived'>;

export interface HabitLog {
  id: string;
  habitId: string;
  logDate: LocalDateString;
  currentCount: number;
  status: HabitLogStatus;
  updatedAt: string;
}

export interface Task {
  id: string;
  habitId: string | null;
  title: string;
  isCompleted: boolean;
  dueDate: LocalDateString | null;
  createdAt: string;
}

export type NewTask = Pick<Task, 'title' | 'habitId' | 'dueDate'>;

export interface FocusSession {
  id: string;
  habitId: string | null;
  taskId: string | null;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  createdAt: string;
}

export type NewFocusSession = Omit<FocusSession, 'id' | 'createdAt'>;

export type MoodScore = 1 | 2 | 3 | 4 | 5;

export interface DailyReflection {
  id: string;
  logDate: LocalDateString;
  moodScore: MoodScore;
  gratitudeText: string;
  lessonText: string;
  createdAt: string;
}

export type ReflectionInput = Pick<DailyReflection, 'logDate' | 'moodScore' | 'gratitudeText' | 'lessonText'>;

export const ALL_WEEKDAYS: readonly Weekday[] = [0, 1, 2, 3, 4, 5, 6];

export function isMoodScore(value: number): value is MoodScore {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}
