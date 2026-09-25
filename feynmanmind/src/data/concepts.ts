import { useMutation, useQuery } from '@tanstack/react-query';
import { cardsOf, deleteConcept, saveConcept } from '@/local/logic';
import { commit, getDB, newId, useDBStore } from '@/local/store';
import { NotFoundError } from '@/local/types';
import { keys } from './keys';
import { read } from './local';

export interface ConceptSummary {
  id: string;
  title: string;
  mastery_level: number;
  cardCount: number;
}

export function useConcepts(subjectId: string) {
  return useQuery({
    queryKey: keys.concepts(subjectId),
    queryFn: () =>
      read((): ConceptSummary[] => {
        const db = getDB();
        return Object.values(db.concepts)
          .filter((c) => c.subject_id === subjectId)
          .sort((a, b) => a.created_at.localeCompare(b.created_at))
          .map((c) => ({ id: c.id, title: c.title, mastery_level: c.mastery_level, cardCount: cardsOf(db, c.id).length }));
      }),
  });
}

export interface ConceptDetail {
  id: string;
  title: string;
  mastery_level: number;
  subject: { id: string; title: string };
}

export function useConcept(id: string) {
  return useQuery({
    queryKey: keys.concept(id),
    queryFn: () =>
      read((): ConceptDetail => {
        const db = getDB();
        const c = db.concepts[id];
        const s = c && db.subjects[c.subject_id];
        if (!c || !s) throw new NotFoundError('Concept');
        return { id: c.id, title: c.title, mastery_level: c.mastery_level, subject: { id: s.id, title: s.title } };
      }),
  });
}

/** Lowest-mastery concepts across all subjects, for the Today screen. */
export function useWeakConcepts(limit = 3) {
  return useQuery({
    queryKey: keys.weakConcepts,
    queryFn: () =>
      read(() => {
        const db = getDB();
        return Object.values(db.concepts)
          .filter((c) => c.mastery_level < 71)
          .sort((a, b) => a.mastery_level - b.mastery_level || b.created_at.localeCompare(a.created_at))
          .slice(0, limit)
          .map((c) => ({ id: c.id, title: c.title, mastery_level: c.mastery_level, subjectTitle: db.subjects[c.subject_id]?.title ?? '' }));
      }),
  });
}

export function useSaveConcept() {
  return useMutation({
    mutationFn: (input: { id?: string; subjectId: string; title: string }) =>
      read(() => commit((db) => saveConcept(db, input, newId, new Date()))),
  });
}

export function useDeleteConcept() {
  return useMutation({
    mutationFn: (id: string) => read(() => useDBStore.getState().update((db) => deleteConcept(db, id))),
  });
}
