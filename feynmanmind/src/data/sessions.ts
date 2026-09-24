import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { evaluateExplanation, type FeynmanEvaluation } from '@/api/functions';
import { supabase } from '@/lib/supabase';
import { keys } from './keys';

export interface SessionRow {
  id: string;
  user_explanation: string;
  socratic_question: string | null;
  comprehension_score: number | null;
  jargon_detected: FeynmanEvaluation['jargon_detected'];
  misconceptions: FeynmanEvaluation['misconceptions'];
  created_at: string;
}

const COLUMNS = 'id, user_explanation, socratic_question, comprehension_score, jargon_detected, misconceptions, created_at';

export function useSessions(conceptId: string) {
  return useQuery({
    queryKey: keys.sessions(conceptId),
    queryFn: async (): Promise<SessionRow[]> => {
      const { data, error } = await supabase
        .from('feynman_sessions')
        .select(COLUMNS)
        .eq('concept_id', conceptId)
        .not('comprehension_score', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as unknown as SessionRow[];
    },
  });
}

export function useSession(id: string) {
  return useQuery({
    queryKey: keys.session(id),
    queryFn: async (): Promise<SessionRow> => {
      const { data, error } = await supabase.from('feynman_sessions').select(COLUMNS).eq('id', id).single();
      if (error) throw error;
      return data as unknown as SessionRow;
    },
  });
}

export function useEvaluateExplanation(conceptId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (explanation: string) => evaluateExplanation(supabase, conceptId, explanation),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.sessions(conceptId) });
      // mastery_level is updated by a trigger on the new score.
      qc.invalidateQueries({ queryKey: ['concepts'] });
      qc.invalidateQueries({ queryKey: keys.subjects });
      qc.invalidateQueries({ queryKey: keys.stats });
    },
  });
}
