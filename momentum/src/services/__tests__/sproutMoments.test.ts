import { usePrefsStore } from '@/state/prefsStore';
import { useNotebookStore } from '@/state/notebookStore';
import { offerMoment } from '../sproutMoments';

const mockGetAll = jest.fn();
const mockMarkShown = jest.fn();
jest.mock('@/data/repositories', () => ({
  repositories: {
    shownInsights: { getAll: () => mockGetAll(), markShown: (...args: unknown[]) => mockMarkShown(...args) },
  },
}));

const TODAY = '2026-10-14';

beforeEach(() => {
  mockGetAll.mockResolvedValue({});
  mockMarkShown.mockReset().mockResolvedValue(undefined);
  useNotebookStore.setState({ notes: {}, saved: [], moment: null });
  usePrefsStore.setState({ look: 'garden' });
});

describe('sprout moments', () => {
  it('tells one fitting card a day in the Garden look, and remembers why', async () => {
    await offerMoment('lowMood', TODAY);
    const moment = useNotebookStore.getState().moment;
    expect(moment).toMatchObject({ date: TODAY, reason: 'lowMood', dismissed: false });
    expect(useNotebookStore.getState().notes[moment?.id ?? '']).toEqual({ date: TODAY, reason: 'lowMood' });
    expect(mockMarkShown).toHaveBeenCalledWith(moment?.id, TODAY);

    await offerMoment('newHabit', TODAY);
    expect(useNotebookStore.getState().moment?.reason).toBe('lowMood');
  });

  it('stays quiet in the regular look', async () => {
    usePrefsStore.setState({ look: 'calm' });
    await offerMoment('notToday', TODAY);
    expect(useNotebookStore.getState().moment).toBeNull();
    expect(mockMarkShown).not.toHaveBeenCalled();
  });
});
