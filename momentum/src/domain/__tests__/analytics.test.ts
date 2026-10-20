import { habitTallies, progressStory } from '../analytics';

describe('progress in plain words', () => {
  const row = (habitId: string, states: string[]) => ({
    habitId,
    title: habitId,
    cells: states.map((state, i) => ({ date: `2026-10-0${i + 1}`, state })),
  }) as unknown as Parameters<typeof habitTallies>[0][number];

  it('counts done out of due, leaving out skipped, paused and future days', () => {
    expect(habitTallies([row('run', ['completed', 'missed', 'skipped', 'paused', 'pending', 'forgiven'])])).toEqual([{ habitId: 'run', title: 'run', done: 2, due: 3 }]);
  });

  it('names the best and the hardest habit, and only says mood when there is enough to say', () => {
    const rows = [row('read', ['completed', 'completed', 'completed', 'completed']), row('run', ['missed', 'completed', 'missed', 'missed']), row('new', ['completed'])];
    const trend = [80, 90, 20, 10, 100, 0, 60].map((completionPercent, i) => ({ date: `2026-10-0${i + 1}`, mood: (completionPercent >= 50 ? 4 : 2) as 2 | 4, completionPercent }));
    const story = progressStory(rows, trend);
    expect(story.best?.habitId).toBe('read');
    expect(story.hardest?.habitId).toBe('run');
    // Days come from the bars' cells: 4 days had something due, all 4 had something done.
    expect(story.activeDays).toBe(4);
    expect(story.days).toBe(4);
    expect(story.percent).toBe(67);
    expect(story.moodLift).toBe(2);
    expect(progressStory(rows, trend.slice(0, 3)).moodLift).toBeNull();
  });

  it('leaves paused and skipped days out, and never calls a habit to quit the hardest', () => {
    const rows = [row('rest', ['paused', 'paused', 'skipped']), row('smoke', ['missed', 'missed', 'missed', 'completed'])];
    const story = progressStory(rows, [], new Set(['smoke']));
    expect(story.days).toBe(4);
    expect(story.percent).toBe(25);
    expect(story.hardest).toBeNull();
  });

  it('does not call a habit hardest when everything went well', () => {
    const rows = [row('a', ['completed', 'completed', 'completed']), row('b', ['completed', 'completed', 'missed'])];
    expect(progressStory(rows, []).hardest).toBeNull();
  });
});
