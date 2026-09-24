/**
 * Types for the Phase 1 schema, in the shape `supabase gen types typescript`
 * produces. Regenerate with the CLI once the project is linked:
 *   supabase gen types typescript --linked > src/types/database.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert, Relationships = []> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: Relationships;
};

export interface Database {
  public: {
    Tables: {
      subjects: Table<
        { id: string; user_id: string; title: string; created_at: string },
        { id?: string; user_id?: string; title: string; created_at?: string }
      >;
      concepts: Table<
        { id: string; subject_id: string; title: string; mastery_level: number; created_at: string },
        { id?: string; subject_id: string; title: string; mastery_level?: number; created_at?: string },
        [
          {
            foreignKeyName: 'concepts_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
        ]
      >;
      feynman_sessions: Table<
        {
          id: string;
          concept_id: string;
          user_explanation: string;
          jargon_detected: Json;
          misconceptions: Json;
          socratic_question: string | null;
          comprehension_score: number | null;
          created_at: string;
        },
        { id?: string; concept_id: string; user_explanation: string; created_at?: string },
        [
          {
            foreignKeyName: 'feynman_sessions_concept_id_fkey';
            columns: ['concept_id'];
            isOneToOne: false;
            referencedRelation: 'concepts';
            referencedColumns: ['id'];
          },
        ]
      >;
      flashcards: Table<
        { id: string; concept_id: string; user_id: string; question: string; answer: string; created_at: string },
        { id?: string; concept_id: string; user_id?: string; question: string; answer: string; created_at?: string },
        [
          {
            foreignKeyName: 'flashcards_concept_id_fkey';
            columns: ['concept_id'];
            isOneToOne: false;
            referencedRelation: 'concepts';
            referencedColumns: ['id'];
          },
        ]
      >;
      card_reviews: Table<
        {
          id: string;
          card_id: string;
          user_id: string;
          easiness_factor: number;
          interval_days: number;
          repetitions: number;
          next_review_date: string;
          last_reviewed_at: string | null;
        },
        {
          easiness_factor?: number;
          interval_days?: number;
          repetitions?: number;
          next_review_date?: string;
          last_reviewed_at?: string | null;
        },
        [
          {
            foreignKeyName: 'card_reviews_card_id_fkey';
            columns: ['card_id'];
            isOneToOne: true;
            referencedRelation: 'flashcards';
            referencedColumns: ['id'];
          },
        ]
      >;
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}
