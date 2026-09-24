import { makeSession } from '@/testing/fixtures';
import { normalizeLayers } from '@/features/focus/soundLayers';
import { compareSoundSessions } from '../soundExperiment';
import { folderLabel, isAutoBackupDue } from '../autoBackup';
import { createTimer } from '../focusTimer';
import { buildFocusWidgetModel } from '@/widget/focusWidgetModel';

describe('compareSoundSessions', () => {
  it('needs enough sessions in both groups and ignores untracked ones', () => {
    const sessions = [
      ...Array.from({ length: 5 }, (_, i) => makeSession({ id: `r${i}`, soundId: 'rain', completed: i < 4, durationMinutes: 20 })),
      ...Array.from({ length: 4 }, (_, i) => makeSession({ id: `s${i}`, soundId: null, completed: i < 2, durationMinutes: 10 })),
      makeSession({ id: 'b', soundId: 'brown', completed: true }),
      makeSession({ id: 'legacy', soundId: null, completed: null }),
    ];
    const result = compareSoundSessions(sessions);
    expect(result.withSound).toMatchObject({ sessions: 6, completionRate: 5 / 6 });
    expect(result.silence).toEqual({ sessions: 4, averageMinutes: 10, completionRate: 0.5 });
    expect(result.enoughData).toBe(false);
    expect(result.favoriteSound).toBe('rain');

    const more = compareSoundSessions([...sessions, makeSession({ id: 'x', soundId: null, completed: true })]);
    expect(more.enoughData).toBe(true);
  });
});

describe('normalizeLayers', () => {
  it('drops invalid and duplicate layers and keeps at most two', () => {
    expect(normalizeLayers('nope')).toEqual([]);
    expect(
      normalizeLayers([
        { id: 'rain', volume: 0.5 },
        { id: 'rain', volume: 0.2 },
        { id: 'off', volume: 0.2 },
        { id: 'brown', volume: 7 },
        { id: 'pink', volume: 0.2 },
      ]),
    ).toEqual([
      { id: 'rain', volume: 0.5 },
      { id: 'brown', volume: 0.5 },
    ]);
  });
});

describe('buildFocusWidgetModel', () => {
  it('shows idle, running with an end time, or finished', () => {
    const start = new Date('2026-09-24T10:00:00');
    const timer = createTimer(25, { habitId: null, taskId: null }, start);
    expect(buildFocusWidgetModel(null, start, 'en-GB')).toEqual({ kind: 'idle' });
    expect(buildFocusWidgetModel(timer, new Date('2026-09-24T10:05:00'), 'en-GB')).toEqual({
      kind: 'running',
      endsAt: '10:25',
      isPaused: false,
      isBreak: false,
    });
    expect(buildFocusWidgetModel(timer, new Date('2026-09-24T10:30:00'), 'en-GB')).toEqual({ kind: 'finished' });
  });
});

describe('auto-backup', () => {
  it('is due weekly and labels SAF folders readably', () => {
    expect(isAutoBackupDue(null, '2026-09-24')).toBe(true);
    expect(isAutoBackupDue('2026-09-18', '2026-09-24')).toBe(false);
    expect(isAutoBackupDue('2026-09-17', '2026-09-24')).toBe(true);
    expect(folderLabel('content://com.android.externalstorage.documents/tree/primary%3ADocuments%2FMomentum')).toBe('Documents/Momentum');
  });
});
