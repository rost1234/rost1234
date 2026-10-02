import { habitActionTarget, notificationData, notificationsToCancel } from '../notificationDone';

describe('after "Done ✓" on a notification', () => {
  const today = '2026-09-30';
  const scheduled = [
    { identifier: 'rescue-water', data: { kind: 'rescue', habitIds: ['water'], date: today } },
    { identifier: 'checkin-both', data: { kind: 'checkin', habitIds: ['water', 'read'], date: today } },
    { identifier: 'tomorrow-water', data: { kind: 'habit', habitIds: ['water'], date: '2026-10-01' } },
    { identifier: 'morning', data: { kind: 'morning' } },
    { identifier: 'legacy', data: { habitId: 'water', date: today } },
  ];

  it("cancels today's notifications that only ask about done habits", () => {
    expect(notificationsToCancel(scheduled, new Set(['water']), today)).toEqual(['rescue-water', 'legacy']);
    expect(notificationsToCancel(scheduled, new Set(['water', 'read']), today)).toEqual(['rescue-water', 'checkin-both', 'legacy']);
    expect(notificationsToCancel(scheduled, new Set(), today)).toEqual([]);
  });

  it('reads the habits and day from new and older notification data', () => {
    expect(habitActionTarget({ habitIds: ['a', 'b', 3], date: today, kind: 'checkin' })).toEqual({ habitIds: ['a', 'b'], date: today, kind: 'checkin' });
    expect(habitActionTarget({ habitId: 'a' }).habitIds).toEqual(['a']);
    expect(habitActionTarget(undefined).habitIds).toEqual([]);
  });

  it('reads data the Android background task gets as a JSON string', () => {
    const data = { kind: 'habit', habitIds: ['water'], date: today };
    expect(notificationData({ dataString: JSON.stringify(data) })).toEqual(data);
    expect(notificationData({ data, dataString: '{"habitIds":["other"]}' })).toEqual(data);
    expect(notificationData({ dataString: 'not json' })).toBeUndefined();
    expect(notificationData({ dataString: '[1,2]' })).toBeUndefined();
    expect(notificationData(undefined)).toBeUndefined();
    expect(habitActionTarget(notificationData({ dataString: JSON.stringify(data) })).habitIds).toEqual(['water']);
  });
});
