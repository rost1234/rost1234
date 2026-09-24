# FeynmanMind

AI-powered active learning: the Feynman Technique plus SM-2 spaced repetition.

## Phase 1: foundations

| Deliverable | Path |
|---|---|
| Supabase schema, constraints, triggers, RLS | `supabase/migrations/20260924000000_phase1_core_schema.sql` |
| SM-2 scheduler `calculateNextReview` | `src/srs/sm2.ts` (tests: `src/srs/sm2.test.ts`) |
| Feynman tutor system prompt, JSON Schema, validator | `supabase/functions/_shared/feynman-tutor.ts` |


### Data-flow rules enforced by the database
- Ownership starts at `subjects.user_id`; policies reach concepts and sessions through `private.owns_*()` helpers.
- A trigger creates a `card_reviews` row (EF 2.5, due now) for every new flashcard. Clients can only `select`/`update` it.
- Clients insert a `feynman_sessions` row with only the explanation. The AI fields are written by the Edge Function using the service role, so clients can't fake scores.
- A new `comprehension_score` updates `concepts.mastery_level`.

## Phase 2: backend wiring

| Piece | Path |
|---|---|
| `feynman-evaluate` Edge Function | `supabase/functions/feynman-evaluate/` |
| `generate-flashcards` Edge Function (text or PDF) | `supabase/functions/generate-flashcards/` |
| Shared: HTTP/CORS, Supabase clients, OpenAI/Gemini client | `supabase/functions/_shared/` |
| Flashcard prompt, schema, chunker | `supabase/functions/_shared/flashcard-generator.ts` |
| Client: Edge Function wrappers | `src/api/functions.ts` |
| Client: due queue + `submitReview` (SM-2) | `src/srs/reviewService.ts` |
| DB types | `src/types/database.ts` |

Each function is split into `index.ts` (HTTP + auth), `repo.ts` (Supabase queries)
and `service.ts` (logic, tested with fake repos and a fake LLM).

### Setup

```bash
supabase db push
supabase secrets set LLM_PROVIDER=openai OPENAI_API_KEY=...   # or LLM_PROVIDER=gemini GEMINI_API_KEY=...
supabase secrets set LLM_MODEL=...                            # optional; defaults gpt-4o-mini / gemini-2.5-flash
supabase functions deploy feynman-evaluate
supabase functions deploy generate-flashcards
```

### Checks

```bash
npm test                  # SM-2 (Node 22+)
npm run typecheck         # client code
npm run test:functions    # Edge Function tests (Deno 2)
npm run check:functions   # Edge Function type-check (Deno 2)
```

### Behaviour worth knowing
- **Limits:** 30 Feynman evaluations and 300 generated cards per user per hour.
  Up to 60k characters of source per call (split into 6k-character chunks, 3 in parallel).
- **Tutor grounding:** the concept's existing flashcards are sent as reference
  material, and the last 5 Socratic questions are sent so they aren't repeated.
- **AI failures:** one retry on 429/5xx/invalid JSON, then `502 llm_error`.
  A failed evaluation deletes its unscored session row.
- **Review conflicts:** `submitReview` only updates if `last_reviewed_at` hasn't
  changed since fetch; otherwise it throws `ReviewConflictError`.
- **PDFs:** text-based only (via `unpdf`). Scanned or encrypted PDFs return `422 unreadable_pdf`.
