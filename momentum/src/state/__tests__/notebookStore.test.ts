import AsyncStorage from '@react-native-async-storage/async-storage';
import { toldTodayNotDaily, useNotebookStore } from '../notebookStore';

const TODAY = '2026-10-14';

beforeEach(async () => {
  await AsyncStorage.clear();
  useNotebookStore.setState({ notes: {}, saved: [], moment: null });
});

describe('the sprout notebook', () => {
  it("keeps a moment's label when the same card is today's card too", () => {
    const { note } = useNotebookStore.getState();
    note('a', TODAY, 'notToday');
    note('a', TODAY, 'daily');
    expect(useNotebookStore.getState().notes.a).toEqual({ date: TODAY, reason: 'notToday' });
    note('b', TODAY, 'daily');
    expect(toldTodayNotDaily(useNotebookStore.getState().notes, TODAY)).toEqual(new Set(['a']));
  });

  it('stars and unstars a card, and puts the moment away once', () => {
    const store = useNotebookStore.getState();
    store.toggleSaved('a');
    expect(useNotebookStore.getState().saved).toEqual(['a']);
    useNotebookStore.getState().toggleSaved('a');
    expect(useNotebookStore.getState().saved).toEqual([]);
    store.setMoment({ id: 'm', date: TODAY, reason: 'lowMood', dismissed: false });
    useNotebookStore.getState().dismissMoment();
    expect(useNotebookStore.getState().moment?.dismissed).toBe(true);
  });

  it('comes back from storage, and what changed meanwhile wins', async () => {
    useNotebookStore.getState().toggleSaved('old');
    useNotebookStore.getState().note('x', TODAY, 'listened');
    await new Promise((resolve) => setTimeout(resolve, 0));
    useNotebookStore.setState({ notes: { y: { date: TODAY, reason: 'daily' } }, saved: ['new'], moment: null });
    await useNotebookStore.getState().hydrate();
    const state = useNotebookStore.getState();
    expect(state.saved.sort()).toEqual(['new', 'old']);
    expect(Object.keys(state.notes).sort()).toEqual(['x', 'y']);
  });

  it('ignores a broken stored copy', async () => {
    await AsyncStorage.setItem('momentum.notebook.v1', JSON.stringify({ notes: { a: { date: 'nope', reason: 'daily' } }, saved: [3], moment: { id: 1 } }));
    await useNotebookStore.getState().hydrate();
    expect(useNotebookStore.getState()).toMatchObject({ notes: {}, saved: [], moment: null });
  });
});
