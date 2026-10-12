import { createContext, useContext } from 'react';
import { router } from 'expo-router';
import { create } from 'zustand';

/** The four main screens, in order: swipe between them like tabs. */
export const PAGES = ['home', 'calendar', 'insights', 'library'] as const;
export type PageId = (typeof PAGES)[number];

const ROUTES: Record<PageId, '/' | '/calendar' | '/analytics' | '/library'> = {
  home: '/',
  calendar: '/calendar',
  insights: '/analytics',
  library: '/library',
};

interface PagerState {
  page: PageId;
  /** Pages built so far (a page is built on its first visit and kept). */
  visited: readonly PageId[];
  /** True while the main pager is on screen (otherwise the pages open as their own screens). */
  active: boolean;
  go: (page: PageId) => void;
}

export const usePagerStore = create<PagerState>((set) => ({
  page: 'home',
  visited: ['home'],
  active: false,
  go: (page) => set((s) => ({ page, visited: s.visited.includes(page) ? s.visited : [...s.visited, page] })),
}));

/** Opens a main screen: the pager's page when it's there, otherwise the screen on its own. */
export function openMain(page: PageId): void {
  const { active, go } = usePagerStore.getState();
  if (active) go(page);
  else if (page !== 'home') router.push(ROUTES[page]);
}

/** Set inside the pager: screens drop their close button and leave room for the tab bar. */
export interface PagerFrame {
  embedded: boolean;
  /** Space the floating tab bar takes at the bottom. */
  bottomBar: number;
}

export const PagerContext = createContext<PagerFrame>({ embedded: false, bottomBar: 0 });

export const usePagerFrame = (): PagerFrame => useContext(PagerContext);
