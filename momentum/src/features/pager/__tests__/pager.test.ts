jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

import { router } from 'expo-router';
import { openMain, PAGES, usePagerStore } from '../pager';

describe('main pager', () => {
  beforeEach(() => usePagerStore.setState({ page: 'home', visited: ['home'], active: false }));

  it('runs Today → month → insights → library', () => {
    expect(PAGES).toEqual(['home', 'calendar', 'insights', 'library']);
  });

  it('builds a page on its first visit and keeps it', () => {
    usePagerStore.getState().go('insights');
    usePagerStore.getState().go('home');
    usePagerStore.getState().go('insights');
    expect(usePagerStore.getState().visited).toEqual(['home', 'insights']);
    expect(usePagerStore.getState().page).toBe('insights');
  });

  it('links switch pages while the pager is on screen, and open the screen on its own otherwise', () => {
    usePagerStore.setState({ active: true });
    openMain('calendar');
    expect(usePagerStore.getState().page).toBe('calendar');
    expect(router.push).not.toHaveBeenCalled();

    usePagerStore.setState({ active: false, page: 'home' });
    openMain('insights');
    expect(router.push).toHaveBeenCalledWith('/analytics');
    expect(usePagerStore.getState().page).toBe('home');
  });
});
