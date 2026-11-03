import { daysSinceBackup } from '../backup';
import { errorLogText, recordError, useErrorLog } from '../errorLog';

describe('backups', () => {
  it('counts whole days since the last backup, null if never', () => {
    const now = new Date('2026-10-21T12:00:00Z');
    expect(daysSinceBackup('', now)).toBeNull();
    expect(daysSinceBackup('2026-10-21T08:00:00Z', now)).toBe(0);
    expect(daysSinceBackup('2026-10-14T11:00:00Z', now)).toBe(7);
  });
});

describe('the error log', () => {
  beforeEach(() => useErrorLog.getState().clear());

  it('keeps the newest errors first, at most 30, and never throws', () => {
    for (let i = 0; i < 35; i++) recordError('test', new Error(`boom ${i}`));
    recordError('test', 'a plain string');
    const { entries } = useErrorLog.getState();
    expect(entries).toHaveLength(30);
    expect(entries[0]!.message).toBe('a plain string');
    expect(entries[1]!.message).toBe('boom 34');
  });

  it('turns into text ready to paste, with the app version', () => {
    recordError('backup', new Error('no folder'));
    const text = errorLogText(useErrorLog.getState().entries, '2.14.0');
    expect(text.startsWith('FeynmanMind 2.14.0')).toBe(true);
    expect(text).toContain('backup: no folder');
  });
});
