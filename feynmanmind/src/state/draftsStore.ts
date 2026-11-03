import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { storage } from '@/lib/storage';

/** Unsent Feynman explanations, per concept, so nothing is lost on navigation. */
interface DraftsState {
  drafts: Record<string, string>;
  setDraft: (conceptId: string, text: string) => void;
  clearDraft: (conceptId: string) => void;
}

export const useDraftsStore = create<DraftsState>()(
  persist(
    (set) => ({
      drafts: {},
      setDraft: (conceptId, text) => set((s) => ({ drafts: { ...s.drafts, [conceptId]: text } })),
      clearDraft: (conceptId) =>
        set((s) => {
          const { [conceptId]: _removed, ...drafts } = s.drafts;
          return { drafts };
        }),
    }),
    { name: 'feynmanmind.drafts', storage: createJSONStorage(() => storage) },
  ),
);
