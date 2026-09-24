/** Raw row shapes exactly as SQLite returns them (snake_case, 0/1 booleans). */

export type SqlBoolean = 0 | 1;

export interface AppSettingsRow {
  id: number;
  is_onboarding_completed: SqlBoolean;
  streak_freezes_available: number;
  created_at: string;
}

export interface HabitRow {
  id: string;
  title: string;
  micro_step: string;
  is_quantitative: SqlBoolean;
  target_count: number;
  unit: string;
  target_frequency: string;
  target_days: string;
  created_at: string;
  is_archived: SqlBoolean;
}

export interface HabitLogRow {
  id: string;
  habit_id: string;
  log_date: string;
  current_count: number;
  status: string;
  updated_at: string;
}

export interface TaskRow {
  id: string;
  habit_id: string | null;
  title: string;
  is_completed: SqlBoolean;
  due_date: string | null;
  created_at: string;
}

export interface FocusSessionRow {
  id: string;
  habit_id: string | null;
  task_id: string | null;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  created_at: string;
}

export interface DailyReflectionRow {
  id: string;
  log_date: string;
  mood_score: number;
  gratitude_text: string;
  lesson_text: string;
  created_at: string;
}
