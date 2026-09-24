import { dbFail, type SupabaseClient } from '../_shared/supabase.ts';
import type { FlashcardRepo } from './service.ts';

/**
 * Everything runs as the caller: RLS + the flashcards_enforce_owner trigger
 * guarantee the cards land on the caller's own concept, and the
 * flashcards_init_review trigger schedules each new card for review.
 */
export function createFlashcardRepo(user: SupabaseClient): FlashcardRepo {
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

    async countCardsSince(since) {
      const { count, error } = await user
        .from('flashcards')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', since.toISOString());
      if (error) dbFail('countCardsSince', error);
      return count ?? 0;
    },

    async existingQuestions(conceptId) {
      const { data, error } = await user
        .from('flashcards')
        .select('question')
        .eq('concept_id', conceptId)
        .order('created_at', { ascending: true })
        .limit(500);
      if (error) dbFail('existingQuestions', error);
      return (data ?? []).map((r) => r.question as string);
    },

    async insertCards(conceptId, cards) {
      const { data, error } = await user
        .from('flashcards')
        .upsert(
          cards.map((c) => ({ concept_id: conceptId, question: c.question, answer: c.answer })),
          { onConflict: 'concept_id,question', ignoreDuplicates: true },
        )
        .select('id, question, answer');
      if (error) dbFail('insertCards', error);
      return data ?? [];
    },
  };
}
