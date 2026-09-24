import { dbFail, type SupabaseClient } from '../_shared/supabase.ts';
import type { FeynmanEvaluation } from '../_shared/feynman-tutor.ts';
import type { FeynmanRepo } from './service.ts';

/**
 * Reads and the session insert run as the caller (RLS enforces ownership).
 * Only the AI fields are written with the service role, because clients have
 * no UPDATE policy on feynman_sessions and can't forge scores.
 */
export function createFeynmanRepo(user: SupabaseClient, admin: SupabaseClient): FeynmanRepo {
  return {
    async getConcept(conceptId) {
      const { data, error } = await user
        .from('concepts')
        .select('id, title, subjects!inner(title)')
        .eq('id', conceptId)
        .maybeSingle();
      if (error) dbFail('getConcept', error);
      if (!data) return null;
      const subject = data.subjects as unknown as { title: string };
      return { id: data.id, title: data.title, subjectTitle: subject.title };
    },

    async countSessionsSince(since) {
      const { count, error } = await user
        .from('feynman_sessions')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', since.toISOString());
      if (error) dbFail('countSessionsSince', error);
      return count ?? 0;
    },

    async previousQuestions(conceptId, limit) {
      const { data, error } = await user
        .from('feynman_sessions')
        .select('socratic_question')
        .eq('concept_id', conceptId)
        .not('socratic_question', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) dbFail('previousQuestions', error);
      return (data ?? []).map((r) => r.socratic_question as string);
    },

    async referenceCards(conceptId, limit) {
      const { data, error } = await user
        .from('flashcards')
        .select('question, answer')
        .eq('concept_id', conceptId)
        .order('created_at', { ascending: true })
        .limit(limit);
      if (error) dbFail('referenceCards', error);
      return data ?? [];
    },

    async createSession(conceptId, explanation) {
      const { data, error } = await user
        .from('feynman_sessions')
        .insert({ concept_id: conceptId, user_explanation: explanation })
        .select('id')
        .single();
      if (error) dbFail('createSession', error);
      return data.id as string;
    },

    async saveEvaluation(sessionId, ev: FeynmanEvaluation) {
      const { error } = await admin
        .from('feynman_sessions')
        .update({
          comprehension_score: ev.comprehension_score,
          socratic_question: ev.socratic_question,
          jargon_detected: ev.jargon_detected,
          misconceptions: ev.misconceptions,
        })
        .eq('id', sessionId);
      if (error) dbFail('saveEvaluation', error);
    },

    async deleteSession(sessionId) {
      const { error } = await user.from('feynman_sessions').delete().eq('id', sessionId);
      if (error) dbFail('deleteSession', error);
    },
  };
}
