import { makeHabit } from '@/testing/fixtures';
import { groupForHome } from '../habitGroups';

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
