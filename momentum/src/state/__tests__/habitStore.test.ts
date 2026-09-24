import type { Habit } from '@/domain/models';
import { makeHabit } from '@/testing/fixtures';
// jest.mock calls below are hoisted above this import by babel-jest.
import { useHabitStore } from '../habitStore';

const mockUpsert = jest.fn();

jest.mock('@/data/repositories', () => ({
  repositories: { habitLogs: { upsert: (...args: unknown[]) => mockUpsert(...args) } },
}));
jest.mock('@/widget/refreshWidget', () => ({ refreshTodayWidget: jest.fn() }));
jest.mock('@/services/streakService', () => ({
  historyStart: () => '2025-01-01',
  reconcileStreakFreezes: jest.fn(),
  statusesByHabit: jest.requireActual('@/services/streakService').statusesByHabit,
}));


const TODAY = '2026-09-24';
const water: Habit = makeHabit({
  id: 'water',
  title: 'Water',
  isQuantitative: true,
  targetCount: 2,
  unit: 'glasses',
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  mockUpsert.mockReset();
  useHabitStore.setState({ today: TODAY, habits: [water], logs: {}, streaks: {}, status: 'ready', error: null });
});

describe('habitStore optimistic updates', () => {
  it('updates state synchronously, then keeps it when the write succeeds', async () => {
    mockUpsert.mockResolvedValue({ id: 'db-1', habitId: 'water', logDate: TODAY, currentCount: 1, status: 'in_progress', updatedAt: 'x' });
    useHabitStore.getState().tapHabit('water');
    expect(useHabitStore.getState().logs.water?.[TODAY]).toMatchObject({ currentCount: 1, status: 'in_progress' });

    useHabitStore.getState().tapHabit('water');
    expect(useHabitStore.getState().logs.water?.[TODAY]).toMatchObject({ currentCount: 2, status: 'completed' });
    expect(useHabitStore.getState().streaks.water).toBe(1);
    await flush();
    expect(mockUpsert).toHaveBeenLastCalledWith({ habitId: 'water', logDate: TODAY, currentCount: 2, status: 'completed' });
  });

  it('rolls back and reports an error when the write fails', async () => {
    mockUpsert.mockRejectedValue(new Error('disk full'));
    useHabitStore.getState().tapHabit('water');
    expect(useHabitStore.getState().logs.water?.[TODAY]?.currentCount).toBe(1);
    await flush();
    expect(useHabitStore.getState().logs.water?.[TODAY]).toBeUndefined();
    expect(useHabitStore.getState().error).toContain('disk full');
  });
});

describe('habitStore undo', () => {
  it('records the last change and restores the previous state', async () => {
    mockUpsert.mockResolvedValue({ id: 'db-1', habitId: 'water', logDate: TODAY, currentCount: 1, status: 'in_progress', updatedAt: 'x' });
    useHabitStore.getState().tapHabit('water');
    useHabitStore.getState().tapHabit('water');
    expect(useHabitStore.getState().lastChange?.label).toBe('Water: Done ✓');

    useHabitStore.getState().undoLast();
    expect(useHabitStore.getState().logs.water?.[TODAY]).toMatchObject({ currentCount: 1, status: 'in_progress' });
    expect(useHabitStore.getState().lastChange).toBeNull();
    await flush();
  });
});
