import { create } from 'zustand';
import { toErrorMessage } from '@/core/errors';
import type { LocalDateString } from '@/core/localDate';
import { repositories } from '@/data/repositories';
import type { FutureLetter } from '@/domain/models';

interface LettersState {
  letters: FutureLetter[] | null;
  error: string | null;
  load: () => Promise<void>;
  write: (body: string, writtenOn: LocalDateString, openOn: LocalDateString) => Promise<void>;
  markOpened: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

/** Letters to your future self: sealed until their day, then on Home once. */
export const useLettersStore = create<LettersState>((set, get) => ({
  letters: null,
  error: null,
  load: async () => {
    try {
      set({ letters: await repositories.letters.getAll(), error: null });
    } catch (error) {
      set({ letters: get().letters ?? [], error: toErrorMessage(error) });
    }
  },
  write: async (body, writtenOn, openOn) => {
    await repositories.letters.create(body, writtenOn, openOn);
    await get().load();
  },
  markOpened: async (id) => {
    await repositories.letters.markOpened(id);
    await get().load();
  },
  remove: async (id) => {
    await repositories.letters.delete(id);
    await get().load();
  },
}));

/** Letters whose day has come and that haven't been read yet. */
export function dueLetters(letters: readonly FutureLetter[], today: LocalDateString): FutureLetter[] {
  return letters.filter((l) => l.openOn <= today && !l.openedAt);
}
