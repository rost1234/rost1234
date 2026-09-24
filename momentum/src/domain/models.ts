import type { LocalDateString, Weekday } from '@/core/localDate';

export type HabitLogStatus = 'in_progress' | 'completed' | 'skipped' | 'forgiven';

/** `daily` = every day; `specific_days` = only the weekdays in `targetDays`. */
export type TargetFrequency = 'daily' | 'specific_days';

export interface AppSettings {
  id: number;
  isOnboardingCompleted: boolean;
  streakFreezesAvailable: number;
  createdAt: string;
  /** Local date of the last perfect-week freeze award. */
  lastFreezeAwardDate: LocalDateString | null;
  /** Evening reflection reminder, minutes after local midnight; null = off. */
  reflectionReminderMinutes: number | null;
  /** Goal picked in onboarding (focus / health / mindset), used to pick relevant insights. */
  goal: string | null;
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
  /** Personal reason for the habit (optional, may be empty). */
  why: string;
  /** "maintain" keeps the target fixed; "grow" suggests gradual level-ups. */
  growthMode: GrowthMode;
  /** For growing habits: the long-term target. */
  goalCount: number | null;
  /** For growing habits: how much the target rises per level. */
  levelStep: number | null;
  /** No level suggestions until after this date. */
  levelSnoozeUntil: LocalDateString | null;
  /** Atomic Habits "make it obvious": when and where. */
  cue: string;
  /** Atomic Habits "make it attractive": pair it with something enjoyable. */
  pairing: string;
  /** Habit stacking: do this right after another habit. */
  afterHabitId: string | null;
  /** Part of the day the habit belongs to (Today shows the current block first). */
  timeOfDay: TimeOfDay;
  /** "smart" = a reminder at the time the habit is usually done. */
  reminder: HabitReminder;
}

export type TimeOfDay = 'any' | 'morning' | 'afternoon' | 'evening';
export type HabitReminder = 'off' | 'smart';

export type GrowthMode = 'maintain' | 'grow';

/** Fields every new habit needs; the rest are optional with sensible defaults. */
type OptionalHabitFields =
  | 'why'
  | 'growthMode'
  | 'goalCount'
  | 'levelStep'
  | 'levelSnoozeUntil'
  | 'cue'
  | 'pairing'
  | 'afterHabitId'
  | 'timeOfDay'
  | 'reminder';

export type NewHabit = Omit<Habit, 'id' | 'createdAt' | 'isArchived' | OptionalHabitFields> &
  Partial<Pick<Habit, OptionalHabitFields>>;

export type DayMode = 'minimum';

export type PauseReason = 'vacation' | 'sick' | 'other';

/** A planned break: streaks are paused (days count as skipped) between the dates. */
export interface Pause {
  id: string;
  startDate: LocalDateString;
  endDate: LocalDateString;
  reason: PauseReason;
  createdAt: string;
}

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
  /** Sound mix that played, e.g. "rain+brown"; null = silence (or logged before v7). */
  soundId: string | null;
  targetMinutes: number | null;
  /** Ran to the planned end; null for sessions logged before v7. */
  completed: boolean | null;
}

export type NewFocusSession = Omit<FocusSession, 'id' | 'createdAt' | 'soundId' | 'targetMinutes' | 'completed'> &
  Partial<Pick<FocusSession, 'soundId' | 'targetMinutes' | 'completed'>>;

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

export interface DailyUsage {
  logDate: LocalDateString;
  seconds: number;
}
