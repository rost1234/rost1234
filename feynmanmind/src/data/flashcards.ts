import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { keys } from './keys';

export interface CardRow {
  id: string;
  question: string;
  answer: string;
  next_review_date: string | null;
}

export function useFlashcards(conceptId: string) {
  return useQuery({
    queryKey: keys.cards(conceptId),
    queryFn: async (): Promise<CardRow[]> => {
      const { data, error } = await supabase
        .from('flashcards')
        .select('id, question, answer, card_reviews(next_review_date)')
        .eq('concept_id', conceptId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data.map((c) => ({
        id: c.id,
        question: c.question,
        answer: c.answer,
        next_review_date: (c.card_reviews as { next_review_date: string } | null)?.next_review_date ?? null,
      }));
    },
  });
}

export function useFlashcard(id: string | undefined) {
  return useQuery({
    queryKey: keys.card(id ?? 'new'),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('flashcards').select('id, concept_id, question, answer').eq('id', id!).single();
      if (error) throw error;
      return data;
    },
  });
}

function invalidateCardQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['cards'] });
  qc.invalidateQueries({ queryKey: ['concepts'] });
  qc.invalidateQueries({ queryKey: ['due'] });
  qc.invalidateQueries({ queryKey: keys.stats });
}

export function useSaveFlashcard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (card: { id?: string; conceptId: string; question: string; answer: string }) => {
      const values = { question: card.question.trim(), answer: card.answer.trim() };
      const query = card.id
        ? supabase.from('flashcards').update(values).eq('id', card.id)
        : supabase.from('flashcards').insert({ concept_id: card.conceptId, ...values });
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => invalidateCardQueries(qc),
  });
}

export function useDeleteFlashcard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('flashcards').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateCardQueries(qc),
  });
}

export { invalidateCardQueries };
