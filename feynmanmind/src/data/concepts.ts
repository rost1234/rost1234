import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { keys } from './keys';

export interface ConceptSummary {
  id: string;
  title: string;
  mastery_level: number;
  cardCount: number;
}

export function useConcepts(subjectId: string) {
  return useQuery({
    queryKey: keys.concepts(subjectId),
    queryFn: async (): Promise<ConceptSummary[]> => {
      const { data, error } = await supabase
        .from('concepts')
        .select('id, title, mastery_level, flashcards(count)')
        .eq('subject_id', subjectId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data.map((c) => ({
        id: c.id,
        title: c.title,
        mastery_level: c.mastery_level,
        cardCount: (c.flashcards as unknown as { count: number }[])[0]?.count ?? 0,
      }));
    },
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
    queryFn: async (): Promise<ConceptDetail> => {
      const { data, error } = await supabase
        .from('concepts')
        .select('id, title, mastery_level, subjects!inner(id, title)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return { id: data.id, title: data.title, mastery_level: data.mastery_level, subject: data.subjects };
    },
  });
}

/** Lowest-mastery concepts across all subjects, for the Today screen. */
export function useWeakConcepts(limit = 3) {
  return useQuery({
    queryKey: keys.weakConcepts,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('concepts')
        .select('id, title, mastery_level, subjects!inner(title)')
        .lt('mastery_level', 71)
        .order('mastery_level', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data.map((c) => ({ id: c.id, title: c.title, mastery_level: c.mastery_level, subjectTitle: c.subjects.title }));
    },
  });
}

export function useSaveConcept() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, subjectId, title }: { id?: string; subjectId: string; title: string }) => {
      const query = id
        ? supabase.from('concepts').update({ title }).eq('id', id)
        : supabase.from('concepts').insert({ subject_id: subjectId, title });
      const { data, error } = await query.select('id').single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['concepts'] });
      qc.invalidateQueries({ queryKey: keys.subjects });
      qc.invalidateQueries({ queryKey: keys.stats });
    },
  });
}

export function useDeleteConcept() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('concepts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}
