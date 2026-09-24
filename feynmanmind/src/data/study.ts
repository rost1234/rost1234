import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { generateFlashcards } from '@/api/functions';
import { deviceTimeZone } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { fetchDueCards } from '@/srs/reviewService';
import { invalidateCardQueries } from './flashcards';
import { keys } from './keys';

export interface StudyStats {
  due_now: number;
  due_today: number;
  reviewed_today: number;
  correct_today: number;
  streak_days: number;
  total_cards: number;
  total_concepts: number;
  avg_mastery: number;
  forecast: { date: string; count: number }[];
  history: { date: string; count: number }[];
}

export function useStudyStats() {
  return useQuery({
    queryKey: keys.stats,
    queryFn: async (): Promise<StudyStats> => {
      const { data, error } = await supabase.rpc('get_study_stats', { p_tz: deviceTimeZone() });
      if (error) throw error;
      return data as unknown as StudyStats;
    },
  });
}

/** Due queue. Not refetched in the background, so the order is stable mid-session. */
export function useDueCards(conceptId?: string) {
  return useQuery({
    queryKey: keys.due(conceptId),
    queryFn: () => fetchDueCards(supabase, { conceptId }),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

export function useGenerateFlashcards(conceptId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ source, maxCards }: { source: { text: string } | { pdfBase64: string }; maxCards: number }) =>
      generateFlashcards(supabase, conceptId, source, maxCards),
    onSuccess: () => invalidateCardQueries(qc),
  });
}
