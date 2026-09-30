# FeynmanMind — notes for Claude

Active-learning app: explain a concept (Feynman technique) → AI tutor asks one Socratic question;
flashcards with SM-2 spaced repetition; guided courses from basics to master's level.
Expo SDK 57 / React Native 0.86 / expo-router. Hebrew-first UI (RTL), English also supported.

## Architecture in one screen

- **Local-first, no accounts.** All user data is one `LocalDB` JSON (`src/local/types.ts`) persisted by
  zustand (`src/local/store.ts`, key `feynmanmind.db`; prefs in `feynmanmind.prefs`).
- **Every data change is a pure function** `LocalDB → LocalDB` in `src/local/logic.ts` (fully unit-tested).
  Screens use React Query hooks in `src/data/*` that call those functions.
- **AI = 5 stateless Supabase Edge Functions** (`supabase/functions/`): `feynman-evaluate`,
  `generate-flashcards`, `generate-course`, `generate-lesson`, `ask-lesson` (questions about a lesson). Shared code in `_shared/`
  (`llm.ts` = OpenAI/Gemini client with structured JSON output, retries and a fallback model).
  They store nothing; the client sends all context. Client wrapper: `src/api/functions.ts`.
- **Content** (`src/content/`):
  - `courses/<id>.ts` — course + **foundations** level with full built-in lessons and cards (offline).
  - `courses/<id>.path.ts` — placement quiz + **advanced / bachelor / master** levels built with
    `fromUnits([{ unit, stations }])`. Upper stations have only `title` + `summary`; the AI writes the
    lesson on first visit (it receives the station's `unit`, i.e. the real university course).
  - `types.ts` — `Course`, `CourseLevel`, `CourseConcept`, `unitsOf`, `stationsOf`, `sources`.
  - Each built-in course cites the curricula it follows in `sources` (shown at the end of its map).

## Rules that must not be broken

1. **Never change or remove an existing station `key`.** Saved progress (`Concept.course_key`) points at
   keys. Reordering, moving between units, and retitling are fine.
2. Units have **3–5 stations**; each level has ≥ 3 units; foundations stations need
   `explanation` (> 300 chars, paragraphs separated by a blank line) and ≥ 3 `cards`.
3. Content is **Hebrew**. Summaries ≤ 160 chars. Placement quizzes: exactly 3 questions per level,
   4 distinct options, `correct` is the 0-based index.
4. In lesson template literals: no backticks and no `${`.
5. **Never write API keys or secrets to any file.** The Gemini key lives only in Supabase secrets.
   The `sb_publishable_…` key is public and may be baked in via `.env.local` (gitignored).
6. Changing a prompt or schema in `supabase/functions/_shared/*` → bump its `*_PROMPT_VERSION` and
   tell the user which functions to redeploy (see `docs/AI-SETUP.md`).

## Checks (run from `feynmanmind/`)

```bash
npm run typecheck && npm run lint && npm test          # app + content validation (src/content/__tests__)
npm run test:functions && npm run check:functions      # Deno; needs deno on PATH
```

Browser smoke test with screenshots: `scripts/e2e/README.md`.
Android APK: `scripts/android/setup-sdk.sh` then `scripts/android/build-apk.sh` (bump the version first).

## Development agents (`/.claude/agents/` at the repo root)

| Task | Agent |
|---|---|
| Research syllabi / degree programs, extend or restructure course maps and placement quizzes | `curriculum-researcher` |
| Write or rewrite built-in foundations lessons and flashcards | `lesson-author` |
| Fact-check and proofread content, find broken quizzes and duplicates | `content-reviewer` |
| Change AI prompts, schemas, the LLM client or Edge Functions | `ai-functions-engineer` |
| Run all checks + browser smoke test with screenshots | `qa-tester` |
| Bump version and build the Android APK | `release-builder` |

Typical content pipeline: `curriculum-researcher` → `lesson-author` → `content-reviewer` → `qa-tester`
→ `release-builder`.
