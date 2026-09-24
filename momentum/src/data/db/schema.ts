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

/** v2: remembers when the last perfect-week streak freeze was awarded. */
const MIGRATION_2 = `
ALTER TABLE app_settings ADD COLUMN last_freeze_award_date TEXT NULL;
`;

/**
 * v3: foreground time per local day (to keep the app honest about its
 * "under 5 minutes" promise) and a configurable reflection reminder
 * (minutes after midnight; NULL = off).
 */
const MIGRATION_3 = `
CREATE TABLE IF NOT EXISTS app_usage (
  log_date TEXT PRIMARY KEY NOT NULL,
  seconds INTEGER NOT NULL DEFAULT 0 CHECK (seconds >= 0)
);
ALTER TABLE app_settings ADD COLUMN reflection_reminder_minutes INTEGER NULL DEFAULT 1260;
`;

/** v4: an optional personal "why" per habit, shown when motivation dips. */
const MIGRATION_4 = `
ALTER TABLE habits ADD COLUMN why TEXT NULL;
`;

/**
 * v5: Atomic Habits (growing targets, cue/pairing, habit stacking),
 * low-energy days and planned pauses (vacation / sick).
 */
const MIGRATION_5 = `
ALTER TABLE habits ADD COLUMN growth_mode TEXT NULL;
ALTER TABLE habits ADD COLUMN goal_count INTEGER NULL;
ALTER TABLE habits ADD COLUMN level_step INTEGER NULL;
ALTER TABLE habits ADD COLUMN level_snooze_until TEXT NULL;
ALTER TABLE habits ADD COLUMN cue TEXT NULL;
ALTER TABLE habits ADD COLUMN pairing TEXT NULL;
ALTER TABLE habits ADD COLUMN after_habit_id TEXT NULL;

CREATE TABLE IF NOT EXISTS day_modes (
  log_date TEXT PRIMARY KEY NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('minimum'))
);

CREATE TABLE IF NOT EXISTS pauses (
  id TEXT PRIMARY KEY NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT 'vacation',
  created_at TEXT NOT NULL,
  CHECK (end_date >= start_date)
);
`;

export const MIGRATIONS: readonly Migration[] = [
  { version: 1, statements: MIGRATION_1 },
  { version: 2, statements: MIGRATION_2 },
  { version: 3, statements: MIGRATION_3 },
  { version: 4, statements: MIGRATION_4 },
  { version: 5, statements: MIGRATION_5 },
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS.reduce((max, m) => Math.max(max, m.version), 0);

/** Table names in dependency order (used for export). */
export const TABLES = [
  'app_settings',
  'habits',
  'habit_logs',
  'tasks',
  'focus_sessions',
  'daily_reflections',
  'app_usage',
  'day_modes',
  'pauses',
] as const;

export type TableName = (typeof TABLES)[number];

export type ColumnType = 'text' | 'integer' | 'nullable_text' | 'nullable_integer';

/**
 * Column whitelist per table, used to validate and restore backups. Only these
 * columns are ever written back, so a tampered file can't inject extra SQL.
 */
export const TABLE_COLUMNS: Readonly<Record<TableName, Readonly<Record<string, ColumnType>>>> = {
  app_settings: {
    id: 'integer',
    is_onboarding_completed: 'integer',
    streak_freezes_available: 'integer',
    created_at: 'text',
    last_freeze_award_date: 'nullable_text',
    reflection_reminder_minutes: 'nullable_integer',
  },
  habits: {
    id: 'text',
    title: 'text',
    micro_step: 'text',
    is_quantitative: 'integer',
    target_count: 'integer',
    unit: 'text',
    target_frequency: 'text',
    target_days: 'text',
    created_at: 'text',
    is_archived: 'integer',
    why: 'nullable_text',
    growth_mode: 'nullable_text',
    goal_count: 'nullable_integer',
    level_step: 'nullable_integer',
    level_snooze_until: 'nullable_text',
    cue: 'nullable_text',
    pairing: 'nullable_text',
    after_habit_id: 'nullable_text',
  },
  habit_logs: {
    id: 'text',
    habit_id: 'text',
    log_date: 'text',
    current_count: 'integer',
    status: 'text',
    updated_at: 'text',
  },
  tasks: {
    id: 'text',
    habit_id: 'nullable_text',
    title: 'text',
    is_completed: 'integer',
    due_date: 'nullable_text',
    created_at: 'text',
  },
  focus_sessions: {
    id: 'text',
    habit_id: 'nullable_text',
    task_id: 'nullable_text',
    start_time: 'text',
    end_time: 'text',
    duration_minutes: 'integer',
    created_at: 'text',
  },
  daily_reflections: {
    id: 'text',
    log_date: 'text',
    mood_score: 'integer',
    gratitude_text: 'text',
    lesson_text: 'text',
    created_at: 'text',
  },
  app_usage: {
    log_date: 'text',
    seconds: 'integer',
  },
  day_modes: {
    log_date: 'text',
    mode: 'text',
  },
  pauses: {
    id: 'text',
    start_date: 'text',
    end_date: 'text',
    reason: 'text',
    created_at: 'text',
  },
};
