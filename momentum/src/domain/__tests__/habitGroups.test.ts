import { makeHabit } from '@/testing/fixtures';
import { groupForHome, setAsideToday } from '../habitGroups';

describe('habit groups on Home', () => {
  const read = makeHabit({ id: 'read', title: 'Read' });
  const run = makeHabit({ id: 'run', title: 'Run', groupName: 'Fitness' });
  const water = makeHabit({ id: 'water', title: 'Water' });
  const push = makeHabit({ id: 'push', title: 'Push-ups', groupName: 'fitness ' });
  const stretch = makeHabit({ id: 'stretch', title: 'Stretch', groupName: 'Fitness' });

  it('folds a group into one item where its first habit is, keeping the order', () => {
    const items = groupForHome([read, run, water, push, stretch]);
    expect(items.map((i) => (i.kind === 'habit' ? i.habit.id : `group:${i.name}:${i.habits.map((h) => h.id).join(',')}`))).toEqual([
      'read',
      'group:Fitness:run,push,stretch',
      'water',
    ]);
  });

  it('a group with one habit due today shows as a plain habit', () => {
    expect(groupForHome([read, run, water])).toEqual([
      { kind: 'habit', habit: read },
      { kind: 'habit', habit: run },
      { kind: 'habit', habit: water },
    ]);
  });
});

describe('set aside for today', () => {
  const morning = makeHabit({ id: 'm', timeOfDay: 'morning' });
  const evening = makeHabit({ id: 'e', timeOfDay: 'evening' });
  const any = makeHabit({ id: 'a' });
  const doneMorning = makeHabit({ id: 'dm', timeOfDay: 'morning' });
  const statuses: Record<string, 'completed' | 'skipped' | 'in_progress'> = { dm: 'completed' };
  const ids = (list: { id: string }[]) => list.map((h) => h.id);

  it('a morning habit not done stays on the list after noon, last and marked late; done ones stay', () => {
    const before = setAsideToday([morning, evening, any, doneMorning], (id) => statuses[id], [], 9);
    expect(ids(before.late)).toEqual([]);
    const after = setAsideToday([morning, evening, any, doneMorning], (id) => statuses[id], [], 13);
    expect(ids(after.open)).toEqual(['e', 'a', 'dm']);
    expect(ids(after.late)).toEqual(['m']);
    expect(ids(after.aside)).toEqual([]);
  });

  it('"I didn\'t do it today" and skipped habits go aside at any hour', () => {
    const result = setAsideToday([morning, evening, any], (id) => (id === 'e' ? 'skipped' : undefined), ['a'], 8);
    expect(ids(result.open)).toEqual(['m']);
    expect(ids(result.aside)).toEqual(['e', 'a']);
  });
});
