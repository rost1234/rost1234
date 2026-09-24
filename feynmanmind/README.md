# FeynmanMind

AI-powered active learning: the Feynman Technique plus SM-2 spaced repetition.

## Phase 1: foundations

| Deliverable | Path |
|---|---|
| Supabase schema, constraints, triggers, RLS | `supabase/migrations/20260924000000_phase1_core_schema.sql` |
| SM-2 scheduler `calculateNextReview` | `src/srs/sm2.ts` (tests: `src/srs/sm2.test.ts`) |
| Feynman tutor system prompt, JSON Schema, validator | `supabase/functions/_shared/feynman-tutor.ts` |

```bash
npm test                 # SM-2 unit tests (Node 22+, no deps)
supabase db push         # apply the migration
```

### Data-flow rules enforced by the database
- Ownership starts at `subjects.user_id`; policies reach concepts and sessions through `private.owns_*()` helpers.
- A trigger creates a `card_reviews` row (EF 2.5, due now) for every new flashcard. Clients can only `select`/`update` it.
- Clients insert a `feynman_sessions` row with only the explanation. The AI fields are written by the Edge Function using the service role, so clients can't fake scores.
- A new `comprehension_score` updates `concepts.mastery_level`.
