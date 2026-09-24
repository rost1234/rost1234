/**
 * SQLite DDL migrations. Migrations are append-only: never edit a shipped
 * migration — add a new entry instead. The version is tracked in
 * `PRAGMA user_version`.
 */

export interface Migration {
  version: number;
  statements: string;
}

const MIGRATION_1 = `
CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY,
  is_onboarding_completed BOOLEAN NOT NULL DEFAULT 0,
  streak_freezes_available INTEGER NOT NULL DEFAULT 2,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS habits (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  micro_step TEXT NOT NULL DEFAULT '',
  is_quantitative BOOLEAN NOT NULL DEFAULT 0,
  target_count INTEGER NOT NULL DEFAULT 1 CHECK (target_count >= 1),
  unit TEXT NOT NULL DEFAULT '',
  target_frequency TEXT NOT NULL DEFAULT 'daily' CHECK (target_frequency IN ('daily', 'specific_days')),
  target_days TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id TEXT PRIMARY KEY NOT NULL,
  habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  log_date TEXT NOT NULL,
  current_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'skipped', 'forgiven')),
  updated_at TEXT NOT NULL,
  UNIQUE (habit_id, log_date)
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY NOT NULL,
  habit_id TEXT NULL REFERENCES habits(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT 0,
  due_date TEXT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS focus_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  habit_id TEXT NULL REFERENCES habits(id) ON DELETE SET NULL,
  task_id TEXT NULL REFERENCES tasks(id) ON DELETE SET NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 0),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_reflections (
  id TEXT PRIMARY KEY NOT NULL,
  log_date TEXT NOT NULL UNIQUE,
  mood_score INTEGER NOT NULL CHECK (mood_score BETWEEN 1 AND 5),
  gratitude_text TEXT NOT NULL DEFAULT '',
  lesson_text TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs (log_date);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks (due_date);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_start ON focus_sessions (start_time);

INSERT OR IGNORE INTO app_settings (id, is_onboarding_completed, streak_freezes_available, created_at)
VALUES (1, 0, 2, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
`;

export const MIGRATIONS: readonly Migration[] = [{ version: 1, statements: MIGRATION_1 }];

export const LATEST_SCHEMA_VERSION = MIGRATIONS.reduce((max, m) => Math.max(max, m.version), 0);

/** Table names in dependency order (used for export). */
export const TABLES = [
  'app_settings',
  'habits',
  'habit_logs',
  'tasks',
  'focus_sessions',
  'daily_reflections',
] as const;

export type TableName = (typeof TABLES)[number];
