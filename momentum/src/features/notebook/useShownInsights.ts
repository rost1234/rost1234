import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { runDetached } from '@/core/errors';
import type { LocalDateString } from '@/core/localDate';
import { repositories } from '@/data/repositories';
import { useNotebookStore } from '@/state/notebookStore';

/** Which cards were told and when (reloaded whenever the screen comes back into view). */
export function useShownInsights(): {
  shown: Record<string, LocalDateString> | null;
  /** "Tell me now" in the notebook: the card counts as told today. */
  listen: (id: string, today: LocalDateString) => void;
} {
  const [shown, setShown] = useState<Record<string, LocalDateString> | null>(null);
  useFocusEffect(
    useCallback(() => {
      let current = true;
      repositories.shownInsights.getAll().then(
        (all) => {
          if (current) setShown(all);
        },
        () => {
          if (current) setShown({});
        },
      );
      return () => {
        current = false;
      };
    }, []),
  );
  const listen = useCallback((id: string, today: LocalDateString) => {
    setShown((all) => ({ ...(all ?? {}), [id]: today }));
    useNotebookStore.getState().note(id, today, 'listened');
    runDetached(repositories.shownInsights.markShown(id, today));
  }, []);
  return { shown, listen };
}
