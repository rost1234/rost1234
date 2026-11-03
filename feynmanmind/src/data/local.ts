import { queryClient } from '@/lib/queryClient';
import { useDBStore } from '@/local/store';

/**
 * Queries read from the on-device store, so any change to it makes them
 * stale. The review queue is excluded: it must stay stable mid-session and is
 * refreshed when the session closes.
 */
useDBStore.subscribe((state, prev) => {
  if (state.db !== prev.db) void queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'due' });
});

/** Resolves on the next tick so React Query treats local reads like any other async source. */
export const read = <T>(fn: () => T): Promise<T> => Promise.resolve().then(fn);
