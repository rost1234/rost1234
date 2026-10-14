import type { Task } from '@/domain/models';
// jest.mock calls below are hoisted above this import by babel-jest.
import { useTaskStore } from '../taskStore';

const mockCreate = jest.fn();
const mockSetDueDate = jest.fn();
const mockDelete = jest.fn();

jest.mock('@/data/repositories', () => ({
  repositories: {
    tasks: {
      create: (...args: unknown[]) => mockCreate(...args),
      setDueDate: (...args: unknown[]) => mockSetDueDate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
  },
}));

const TODAY = '2026-10-14';
const task = (id: string, dueDate: string | null, createdAt = '2026-10-14T08:00:00.000Z'): Task => ({
  id,
  habitId: null,
  title: id,
  isCompleted: false,
  dueDate,
  createdAt,
});
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  mockCreate.mockReset();
  mockSetDueDate.mockReset().mockResolvedValue(undefined);
  mockDelete.mockReset().mockResolvedValue(undefined);
  useTaskStore.setState({ today: TODAY, tasks: [], overdue: [], later: [], upcoming: [], isLoaded: true, error: null });
});

describe('planning tasks for the coming days', () => {
  it('a task planned for the coming week shows in Coming up, soonest first; further ahead it waits quietly', async () => {
    mockCreate.mockImplementation(async (input: { title: string; dueDate: string }) => task(input.title, input.dueDate));
    await useTaskStore.getState().planTask('Friday', '2026-10-16');
    await useTaskStore.getState().planTask('Tomorrow', '2026-10-15');
    await useTaskStore.getState().planTask('Next month', '2026-11-14');
    expect(useTaskStore.getState().upcoming.map((t) => t.title)).toEqual(['Tomorrow', 'Friday']);
    expect(useTaskStore.getState().tasks).toEqual([]);
  });

  it('moves a task into the coming week, and from it to today, Later or away', async () => {
    useTaskStore.setState({ tasks: [task('a', TODAY)], upcoming: [task('b', '2026-10-17')] });
    useTaskStore.getState().moveToDate('a', '2026-10-15');
    expect(useTaskStore.getState().upcoming.map((t) => [t.id, t.dueDate])).toEqual([
      ['a', '2026-10-15'],
      ['b', '2026-10-17'],
    ]);
    useTaskStore.getState().decide('b', 'today');
    expect(useTaskStore.getState().tasks.map((t) => [t.id, t.dueDate])).toEqual([['b', TODAY]]);
    useTaskStore.getState().decide('a', 'drop');
    expect(useTaskStore.getState().upcoming).toEqual([]);
    await flush();
    expect(mockDelete).toHaveBeenCalledWith('a');
  });

  it('drops a planned task even when it is beyond the lists (the reflection plans a week ahead)', () => {
    useTaskStore.getState().decide('far', 'drop');
    expect(mockDelete).toHaveBeenCalledWith('far');
  });
});
