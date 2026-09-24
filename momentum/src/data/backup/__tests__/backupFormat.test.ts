import { parseBackup } from '../backupFormat';

const valid = {
  app: 'momentum',
  schemaVersion: 1,
  exportedAt: '2026-09-24T10:00:00.000Z',
  tables: {
    app_settings: [{ id: 1, is_onboarding_completed: 1, streak_freezes_available: 2, created_at: 'x' }],
    habits: [
      {
        id: 'h1',
        title: 'Read',
        micro_step: '',
        is_quantitative: 1,
        target_count: 10,
        unit: 'pages',
        target_frequency: 'daily',
        target_days: '[]',
        created_at: 'x',
        is_archived: 0,
        extra_column: 'ignored',
      },
    ],
    habit_logs: [],
    tasks: [{ id: 't1', habit_id: null, title: 'A', is_completed: 0, due_date: null, created_at: 'x' }],
    focus_sessions: [],
    daily_reflections: [],
  },
};

describe('parseBackup', () => {
  it('accepts an export and keeps only whitelisted columns', () => {
    const result = parseBackup(JSON.stringify(valid));
    if (!result.ok) throw new Error(result.error);
    expect(result.counts.habits).toBe(1);
    expect(result.counts.tasks).toBe(1);
    expect(result.backup.tables.habits[0]).not.toHaveProperty('extra_column');
  });

  it('treats a missing table as empty', () => {
    const { daily_reflections: _omitted, ...tables } = valid.tables;
    const result = parseBackup(JSON.stringify({ ...valid, tables }));
    expect(result.ok && result.counts.daily_reflections).toBe(0);
  });

  it.each([
    ['not json', '{'],
    ['another app', JSON.stringify({ ...valid, app: 'other' })],
    ['a newer schema', JSON.stringify({ ...valid, schemaVersion: 99 })],
    ['a wrongly typed column', JSON.stringify({ ...valid, tables: { ...valid.tables, tasks: [{ ...valid.tables.tasks[0], title: 5 }] } })],
  ])('rejects %s', (_label, json) => {
    expect(parseBackup(json).ok).toBe(false);
  });
});
