import { useMutation, useQuery } from '@tanstack/react-query';
import { deleteSubject, saveSubject } from '@/local/logic';
import { commit, getDB, newId, useDBStore } from '@/local/store';
import { NotFoundError } from '@/local/types';
import { keys } from './keys';
import { read } from './local';

export interface SubjectSummary {
  id: string;
  title: string;
  created_at: string;
  conceptCount: number;
  avgMastery: number;
}

export function useSubjects() {
  return useQuery({
    queryKey: keys.subjects,
    queryFn: () =>
      read((): SubjectSummary[] => {
        const db = getDB();
        return Object.values(db.subjects)
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .map((s) => {
            const levels = Object.values(db.concepts).filter((c) => c.subject_id === s.id).map((c) => c.mastery_level);
            return {
              ...s,
              conceptCount: levels.length,
              avgMastery: levels.length ? Math.round(levels.reduce((a, b) => a + b, 0) / levels.length) : 0,
            };
          });
      }),
  });
}

export function useSubject(id: string) {
  return useQuery({
    queryKey: keys.subject(id),
    queryFn: () =>
      read(() => {
        const s = getDB().subjects[id];
        if (!s) throw new NotFoundError('Subject');
        return s;
      }),
  });
}

export function useSaveSubject() {
  return useMutation({
    mutationFn: ({ id, title }: { id?: string; title: string }) =>
      read(() => commit((db) => saveSubject(db, { id, title }, newId, new Date()))),
  });
}

export function useDeleteSubject() {
  return useMutation({
    mutationFn: (id: string) => read(() => useDBStore.getState().update((db) => deleteSubject(db, id))),
  });
}
