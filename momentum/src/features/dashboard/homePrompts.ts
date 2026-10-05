import { useEffect } from 'react';
import { create } from 'zustand';

/**
 * One-off prompt cards on Home, most important first. Only one shows at a time,
 * so a busy morning doesn't push the habits below the fold; the next one gets
 * its turn once the first is closed (or another day).
 */
const ORDER = ['welcomeBack', 'firstWin', 'letter', 'yesterday', 'automatic'] as const;
export type HomePrompt = (typeof ORDER)[number];

const usePrompts = create<{ wants: Partial<Record<HomePrompt, boolean>> }>(() => ({ wants: {} }));

/** Registers whether `id` wants to show; returns true when it's the one to show now. */
export function useHomePromptSlot(id: HomePrompt, wants: boolean): boolean {
  useEffect(() => {
    usePrompts.setState((s) => ({ wants: { ...s.wants, [id]: wants } }));
    return () => usePrompts.setState((s) => ({ wants: { ...s.wants, [id]: false } }));
  }, [id, wants]);
  const first = usePrompts((s) => ORDER.find((p) => s.wants[p]));
  return wants && first === id;
}
