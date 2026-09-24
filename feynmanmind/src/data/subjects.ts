import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { keys } from './keys';

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
    queryFn: async (): Promise<SubjectSummary[]> => {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, title, created_at, concepts(mastery_level)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map((s) => {
        const levels = s.concepts.map((c) => c.mastery_level);
        return {
          id: s.id,
          title: s.title,
          created_at: s.created_at,
          conceptCount: levels.length,
          avgMastery: levels.length ? Math.round(levels.reduce((a, b) => a + b, 0) / levels.length) : 0,
        };
      });
    },
  });
}

export function useSubject(id: string) {
  return useQuery({
    queryKey: keys.subject(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('subjects').select('id, title').eq('id', id).single();
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, title }: { id?: string; title: string }) => {
      const query = id
        ? supabase.from('subjects').update({ title }).eq('id', id)
        : supabase.from('subjects').insert({ title });
      const { data, error } = await query.select('id').single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.subjects }),
  });
}

export function useDeleteSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('subjects').delete().eq('id', id);
      if (error) throw error;
    },
    // Cascades remove concepts, cards and reviews, so refresh all of them.
    onSuccess: () => qc.invalidateQueries(),
  });
}
