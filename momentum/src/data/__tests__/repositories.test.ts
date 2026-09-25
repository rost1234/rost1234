/** @jest-environment node */
import { parseBackup } from '../backup/backupFormat';
import { SqliteBackupRepository } from '../repositories/sqliteBackupRepository';
import { SqliteHabitLogRepository } from '../repositories/sqliteHabitLogRepository';
import { SqliteHabitRepository } from '../repositories/sqliteHabitRepository';
import { SqliteFocusSessionRepository } from '../repositories/sqliteFocusSessionRepository';
import { SqliteDayModeRepository, SqlitePauseRepository, SqliteShownInsightRepository } from '../repositories/sqlitePlanningRepositories';
import { SqliteReflectionRepository } from '../repositories/sqliteReflectionRepository';
import { SqliteSettingsRepository } from '../repositories/sqliteSettingsRepository';
import { SqliteTaskRepository } from '../repositories/sqliteTaskRepository';
import { SqliteUsageRepository } from '../repositories/sqliteUsageRepository';
import type { SqlExecutor } from '../repositories/types';
import { LATEST_SCHEMA_VERSION } from '../db/schema';
import { applyRemainingMigrations, createTestDatabase } from './nodeSqlite';

jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('crypto')>('crypto').randomUUID() }));

function repos(executor: SqlExecutor) {
  const provider = () => Promise.resolve(executor);
  return {
    settings: new SqliteSettingsRepository(provider),
    habits: new SqliteHabitRepository(provider),
    logs: new SqliteHabitLogRepository(provider),
    tasks: new SqliteTaskRepository(provider),
    reflections: new SqliteReflectionRepository(provider),
    usage: new SqliteUsageRepository(provider),
    backup: new SqliteBackupRepository(provider),
    focus: new SqliteFocusSessionRepository(provider),
  };
}

const newHabit = {
  title: ' Read ',
  microStep: 'Open the book',
  isQuantitative: true,
  targetCount: 10,
  unit: 'pages',
  targetFrequency: 'daily' as const,
  targetDays: [],
};

describe('migrations', () => {
  it('upgrades a v1 database with data to the latest schema', async () => {
    const { db, executor } = createTestDatabase({ upToVersion: 1 });
    db.exec("INSERT INTO tasks VALUES ('t1', NULL, 'kept', 0, '2026-09-20', 'x')");
    applyRemainingMigrations(db, 1);
    const r = repos(executor);
    const settings = await r.settings.get();
    expect(settings).toMatchObject({ streakFreezesAvailable: 2, lastFreezeAwardDate: null, reflectionReminderMinutes: 1260 });
    expect((await r.tasks.getOverdue('2026-09-24')).map((t) => t.title)).toEqual(['kept']);
    expect(LATEST_SCHEMA_VERSION).toBeGreaterThanOrEqual(4);
    expect((await r.habits.create({ ...newHabit, why: ' energy ' })).why).toBe('energy');
  });
});

describe('focus sessions (v7 experiment fields)', () => {
  it('keeps pre-v7 sessions as untracked and stores new fields', async () => {
    const { db, executor } = createTestDatabase({ upToVersion: 6 });
    db.exec("INSERT INTO focus_sessions (id, habit_id, task_id, start_time, end_time, duration_minutes, created_at) VALUES ('old', NULL, NULL, '2026-09-20T10:00:00Z', '2026-09-20T10:25:00Z', 25, 'x')");
    applyRemainingMigrations(db, 6);
    const r = repos(executor);
    await r.focus.create({ habitId: null, taskId: null, startTime: '2026-09-21T10:00:00Z', endTime: '2026-09-21T10:10:00Z', durationMinutes: 10, soundId: 'rain+brown', targetMinutes: 25, completed: false });
    const all = await r.focus.getAll();
    expect(all.map((s) => [s.soundId, s.targetMinutes, s.completed])).toEqual([
      [null, null, null],
      ['rain+brown', 25, false],
    ]);
  });
});

describe('settings', () => {
  it('caps awarded freezes, floors consumed ones and stores the reminder', async () => {
    const r = repos(createTestDatabase().executor);
    expect(await r.settings.awardStreakFreeze('2026-09-24', 3)).toBe(3);
    expect(await r.settings.awardStreakFreeze('2026-10-01', 3)).toBe(3);
    expect((await r.settings.get()).lastFreezeAwardDate).toBe('2026-10-01');
    expect(await r.settings.consumeStreakFreezes(5)).toBe(0);
    await r.settings.setReflectionReminder(20 * 60 + 30);
    expect((await r.settings.get()).reflectionReminderMinutes).toBe(1230);
    await r.settings.setReflectionReminder(null);
    expect((await r.settings.get()).reflectionReminderMinutes).toBeNull();
  });
});

describe('habits and logs', () => {
  it('creates, edits and archives habits', async () => {
    const r = repos(createTestDatabase().executor);
    const habit = await r.habits.create(newHabit);
    expect(habit.title).toBe('Read');
    expect(habit.why).toBe('');
    await r.habits.update(habit.id, { targetCount: 5, targetFrequency: 'specific_days', targetDays: [3, 1, 1], why: 'kids' });
    expect(await r.habits.getById(habit.id)).toMatchObject({ targetCount: 5, targetDays: [1, 3], why: 'kids' });
    await r.habits.setArchived(habit.id, true);
    expect(await r.habits.getAll()).toHaveLength(0);
    expect(await r.habits.getAll({ includeArchived: true })).toHaveLength(1);
  });

  it('upserts one log per habit/day and never forgives a completed day', async () => {
    const r = repos(createTestDatabase().executor);
    const habit = await r.habits.create(newHabit);
    const first = await r.logs.upsert({ habitId: habit.id, logDate: '2026-09-23', currentCount: 3, status: 'in_progress' });
    const second = await r.logs.upsert({ habitId: habit.id, logDate: '2026-09-23', currentCount: 10, status: 'completed' });
    expect(second.id).toBe(first.id);
    expect(first.source).toBe('app');
    expect(second).toMatchObject({ currentCount: 10, status: 'completed' });
    const fromCheckIn = await r.logs.upsert({ habitId: habit.id, logDate: '2026-09-23', currentCount: 10, status: 'completed', source: 'checkin' });
    expect(fromCheckIn.source).toBe('checkin');

    await r.logs.upsert({ habitId: habit.id, logDate: '2026-09-22', currentCount: 2, status: 'in_progress' });
    await r.logs.forgive([
      { habitId: habit.id, logDate: '2026-09-23' },
      { habitId: habit.id, logDate: '2026-09-22' },
      { habitId: habit.id, logDate: '2026-09-21' },
    ]);
    const statuses = Object.fromEntries(
      (await r.logs.getInRange('2026-09-01', '2026-09-30')).map((l) => [l.logDate, l.status]),
    );
    expect(statuses).toEqual({ '2026-09-21': 'forgiven', '2026-09-22': 'forgiven', '2026-09-23': 'completed' });
  });

  it('cascades logs when a habit is deleted', async () => {
    const r = repos(createTestDatabase().executor);
    const habit = await r.habits.create(newHabit);
    await r.logs.upsert({ habitId: habit.id, logDate: '2026-09-23', currentCount: 1, status: 'in_progress' });
    await r.habits.delete(habit.id);
    expect(await r.logs.getForDate('2026-09-23')).toEqual([]);
  });
});

describe('tasks', () => {
  it('separates today, overdue and Later, and moves between them', async () => {
    const r = repos(createTestDatabase().executor);
    const today = '2026-09-24';
    const a = await r.tasks.create({ title: 'today', habitId: null, dueDate: today });
    const b = await r.tasks.create({ title: 'old', habitId: null, dueDate: '2026-09-20' });
    await r.tasks.create({ title: 'later', habitId: null, dueDate: null });

    expect((await r.tasks.getForDate(today)).map((t) => t.title)).toEqual(['today']);
    expect((await r.tasks.getOverdue(today)).map((t) => t.title)).toEqual(['old']);
    expect((await r.tasks.getBacklog()).map((t) => t.title)).toEqual(['later']);

    await r.tasks.setDueDate(b.id, today);
    await r.tasks.setCompleted(a.id, true, today);
    expect((await r.tasks.getForDate(today)).map((t) => [t.title, t.isCompleted])).toEqual([
      ['old', false],
      ['today', true],
    ]);
    expect(await r.tasks.getOverdue(today)).toEqual([]);
  });
});

describe('reflections and usage', () => {
  it('keeps one reflection per day', async () => {
    const r = repos(createTestDatabase().executor);
    await r.reflections.upsert({ logDate: '2026-09-24', moodScore: 2, gratitudeText: 'a', lessonText: 'b' });
    await r.reflections.upsert({ logDate: '2026-09-24', moodScore: 5, gratitudeText: ' c ', lessonText: 'd' });
    const all = await r.reflections.getInRange('2026-09-01', '2026-09-30');
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ moodScore: 5, gratitudeText: 'c' });
  });

  it('accumulates foreground seconds per day', async () => {
    const r = repos(createTestDatabase().executor);
    await r.usage.addSeconds('2026-09-24', 40.4);
    await r.usage.addSeconds('2026-09-24', 20);
    await r.usage.addSeconds('2026-09-24', 0.2);
    expect(await r.usage.getInRange('2026-09-24', '2026-09-24')).toEqual([{ logDate: '2026-09-24', seconds: 60 }]);
  });
});

describe('backup round trip', () => {
  it('exports, validates and restores into another database unchanged', async () => {
    const source = repos(createTestDatabase().executor);
    const habit = await source.habits.create(newHabit);
    await source.logs.upsert({ habitId: habit.id, logDate: '2026-09-24', currentCount: 4, status: 'in_progress' });
    await source.tasks.create({ title: 't', habitId: habit.id, dueDate: null });
    await source.usage.addSeconds('2026-09-24', 90);
    const snapshot = await source.backup.exportAll();

    const parsed = parseBackup(JSON.stringify({ app: 'momentum', schemaVersion: LATEST_SCHEMA_VERSION, exportedAt: 'x', tables: snapshot }));
    if (!parsed.ok) throw new Error(parsed.error.code);

    const target = repos(createTestDatabase().executor);
    await target.tasks.create({ title: 'will be replaced', habitId: null, dueDate: null });
    await target.backup.replaceAll(parsed.backup.tables);
    expect(await target.backup.exportAll()).toEqual(snapshot);
  });
});

describe('wave 2 tables', () => {
  it('upgrades v4 data to v5 and stores Atomic-Habits fields, day modes and pauses', async () => {
    const { db, executor } = createTestDatabase({ upToVersion: 4 });
    db.exec("INSERT INTO habits (id, title, created_at) VALUES ('old', 'Old habit', '2026-09-01T08:00:00')");
    applyRemainingMigrations(db, 4);
    const r = repos(executor);
    const planning = {
      dayModes: new SqliteDayModeRepository(() => Promise.resolve(executor)),
      pauses: new SqlitePauseRepository(() => Promise.resolve(executor)),
    };

    expect(await r.habits.getById('old')).toMatchObject({ growthMode: 'maintain', goalCount: null, cue: '', afterHabitId: null });
    const grown = await r.habits.create({ ...newHabit, growthMode: 'grow', goalCount: 20, levelStep: 2, cue: ' after coffee ', afterHabitId: 'old' });
    expect(await r.habits.getById(grown.id)).toMatchObject({ growthMode: 'grow', goalCount: 20, levelStep: 2, cue: 'after coffee', afterHabitId: 'old' });

    await planning.dayModes.set('2026-09-24', 'minimum');
    expect(await planning.dayModes.get('2026-09-24')).toBe('minimum');
    await planning.dayModes.set('2026-09-24', null);
    expect(await planning.dayModes.get('2026-09-24')).toBeNull();

    const pause = await planning.pauses.create('2026-10-01', '2026-10-07', 'vacation');
    expect(await planning.pauses.getAll()).toEqual([pause]);
    await planning.pauses.delete(pause.id);
    expect(await planning.pauses.getAll()).toEqual([]);
  });
});

describe('wave 4 tables', () => {
  it('upgrades v5 to v6: goal, time of day, smart reminder and shown insights', async () => {
    const { db, executor } = createTestDatabase({ upToVersion: 5 });
    db.exec("INSERT INTO habits (id, title, created_at) VALUES ('old', 'Old habit', '2026-09-01T08:00:00')");
    applyRemainingMigrations(db, 5);
    const r = repos(executor);
    const shown = new SqliteShownInsightRepository(() => Promise.resolve(executor));

    expect(await r.habits.getById('old')).toMatchObject({ timeOfDay: 'any', reminder: 'off' });
    const h = await r.habits.create({ ...newHabit, timeOfDay: 'morning', reminder: 'smart' });
    expect(await r.habits.getById(h.id)).toMatchObject({ timeOfDay: 'morning', reminder: 'smart' });
    await r.habits.update(h.id, { timeOfDay: 'evening' });
    expect((await r.habits.getById(h.id))?.timeOfDay).toBe('evening');

    expect((await r.settings.get()).goal).toBeNull();
    await r.settings.setGoal('focus');
    expect((await r.settings.get()).goal).toBe('focus');

    await shown.markShown('if-then-plans', '2026-09-24');
    await shown.markShown('if-then-plans', '2026-09-30');
    expect(await shown.getAll()).toEqual({ 'if-then-plans': '2026-09-30' });
  });
});
