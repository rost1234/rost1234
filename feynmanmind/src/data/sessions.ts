import { useQuery } from '@tanstack/react-query';
import { sessionsOf } from '@/local/logic';
import { getDB } from '@/local/store';
import { NotFoundError, type FeynmanSession } from '@/local/types';
import { keys } from './keys';
import { read } from './local';

export type SessionRow = FeynmanSession;

export function useSessions(conceptId: string) {
  return useQuery({
    queryKey: keys.sessions(conceptId),
    queryFn: () => read(() => sessionsOf(getDB(), conceptId)),
  });
}

export function useSession(id: string) {
  return useQuery({
    queryKey: keys.session(id),
    queryFn: () =>
      read(() => {
        const s = getDB().sessions[id];
        if (!s) throw new NotFoundError('Session');
        return s;
      }),
  });
}
