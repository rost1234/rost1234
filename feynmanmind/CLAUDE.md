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
  - `lesson.ts` — `LessonParts`, the structured lesson (hook, sections, example, misconception,
    connection, 2–3 `check` questions). Built-in foundations lessons use `parts` (no `explanation`);
    the AI writes the same shape (`_shared/lesson-writer.ts`). `lessonPlainText` gives the text form.
  - Each built-in course cites the curricula it follows in `sources` (shown at the end of its map).

## Navigation

`src/app/(app)/(tabs)/` holds the four swipeable tabs (`expo-router/js-top-tabs` with the bar at the
bottom — Expo Router 57 refuses `@react-navigation/*` packages, use its wrappers): Today (next step +
checklist, `src/features/today`), Learn (search, my courses, catalog, library — `src/features/learn`),
Review (count, filters, week, forecast — `src/features/review`), Me (stats, achievements, grouped settings).
A station (`course/[id]/[key].tsx`) runs in four steps (read → check yourself → explain → practice); moving
past the key points starts it; swiping sideways or the bottom bar moves between steps, and the bar's 💬 opens
lesson questions in a bottom sheet (`features/lesson/AskSheet.tsx`). Explaining (`concept/[id]/explain.tsx`)
is a chat with the tutor saved per concept (`LocalDB.tutorChats`): the tutor's `next_step` says whether it
wants a short answer, a rewrite (`refine_quote`), or is done; it also returns key-idea `coverage` and
hidden help the app reveals on request (3 `hints`, then `question_answer`, and `model_explanation`
after a score of 71+ or three attempts); "I didn't understand the question" goes to
`ask-lesson` with `tutor_question` (clarify, never answer). Screens with typing use `KeyboardInsetView`
(`src/lib/keyboard.tsx`). Library subjects open as a map too (`subject/[id].tsx`). Learning on paper
(`print/index.tsx`, from the Review tab): `src/print/plan.ts` lays out a month (lesson days, reviews at
+1/+3/+7/+14), `src/print/html.ts` draws A4-landscape pages in four paper modes (full/saver/max/track),
colour or black and white; `expo-print` prints or saves a PDF; `print/results.tsx` brings the paper
results back (`applyPaperResults`). Importing lessons (`import.tsx`, from Learn and the "+" menu): a picked file (`services/importFile.ts`) or pasted JSON
`[{topic, concept, reference, keyPoints?}]` is parsed by `src/content/import.ts` (`parseLessonImport`, `ImportError`)
and added by `importLessons` to an on-device imported course: one per name the learner types (`imp-<hash of name>`; no name =
the default course `imported`; `isImportedCourse`), topic = unit, duplicates by concept skipped per course, station keys
hashed from the concept. Cards are kept in check: a lesson gets the automatic "explain it" card only if the file gives it no
cards of its own (and the switch is on; otherwise the station is `lean`), and the AI's full lesson adds at most
`AI_UPGRADE_CARDS` (3), none at `ENOUGH_CARDS` (4), never twice. Missing lessons of any course are written by
`data/lessonQueue.ts` (`LessonQueueCard` on the map: 2 at a time, waits out the server's hourly limit, skips failures).
The notebook looks draw course/subject maps as a checklist (`features/learn/ChecklistRow`), classic keeps the path.
The card store (`cards/index.tsx`, from the Review tab) shows counts and the cards by subject/concept, with bulk delete. Stations with a `reference` run as `features/lesson/SelfCheck.tsx`: explain → reveal
the reference and key points → rate 1–5 (`addSelfCheck`, mastery = rating × 20) → full lesson. The full lesson
comes from the file (optional `hook`/`sections`/`example`/`misconception`/`connection`/`check`/`cards`, validated with
`lessonProblems`; `RICH_FORMAT_PROMPT` is the copyable AI instruction) or from `generate-lesson` with `reference` +
`key_points` as the source of truth (`upgradeOne`, saved by
`saveImportedLesson`). Everything else
(course maps, stations, concept pages, the review session) is a stack screen in `src/app/(app)/`.
Review limits and accessibility live in `src/state/prefsStore.ts`; the theme reads text size and
contrast from it (`useTheme().textScale`), `useReduceMotion()` covers animations.

## Look (`src/theme/`)

Three looks (`useTheme().look`): **paper** (lab notebook, light), **chalk** (chalkboard, dark) — together the
"notebook" style — and **classic** (the original indigo look, light and dark). The style is a pref
(`prefs.look`: `'notebook' | 'classic'`, picked in Me → Display, `features/settings/LookPicker.tsx`).
`useTheme()` gives `colors` (incl. `button`, `ink`, `highlight`, `chrome`), `fonts` (body/heading/hand),
`map` (course-map colors), `look` and `sheet` (a card surface for the current look). Branch on `look`, never
on `isDark`, for styling (isDark is only light vs dark). Fonts are bundled per weight (`assets/fonts`,
expo-font plugin in app.json, `@font-face` on web via `lib/fonts.web.ts`): Frank Ruhl Libre (paper), Rubik
(chalk body, classic), Amatic SC (handwriting/chalk headings — its Latin letters are all caps). Always use
`Text`/`TextInput` from `@/components/Text`. `components/Backdrop` draws ruled paper with binder holes and
margin doodles / the chalkboard with faded formulas (nothing in classic); `components/sketch.tsx` has the
hand-drawn SVG shapes (`SketchBorder`, `SketchCircle`, `Squiggle`, `SketchCheck`, `Stamp`, `useSeed`);
`components/Pinned` is the taped sheet / chalk frame. Textures are generated images in `assets/textures`.
Don't hard-code colors: use the palette, `theme.map` or `theme.sheet`.

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
7. Every AI reply is in the app's language (`_shared/language.ts`, `LANGUAGE_RULES` in every prompt),
   whatever language the learner types in. New prompts must include it.

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
