# FeynmanMind

Active learning with the **Feynman Technique** and **spaced repetition (SM-2)**.
Explain a concept in plain words, get one Socratic question back from an AI tutor
(never the answer), and turn notes or PDFs into flashcards that come back just
before you'd forget them.

Expo (React Native, iOS / Android / web). English and Hebrew (RTL), light and dark themes.

**No sign-in, no account, no cloud copy.** Everything is stored on the device.
The only thing that goes over the network is the text of an AI request.

## Features

The whole app is **one scrolling home screen**, top to bottom: today's review and streak, stats,
concepts to explain next, the library (subjects open in place to show their concepts), 7-day
charts and settings. Concept pages, the Feynman editor, card generation and the review session
open on top of it. Every scrolling screen ends with extra space below the last item (plus the
device's bottom safe-area inset), so nothing is ever stuck under the home indicator.

| Area | What it does |
|---|---|
| Learning paths | 6 built-in guided courses in Hebrew (physics, biology, math, computing & AI, economics, psychology): an ordered map of 7–8 stations, each with a lesson and flashcards, available offline. Type any topic and the AI builds a new map in the same format. |
| Library | Subjects → concepts. Create, rename, delete. Mastery bar per subject. |
| Feynman tutor | Write an explanation (drafts are kept per concept). Get a score, verdict, one Socratic question, jargon to unpack and misconceptions, without being told the answer. Revise and resubmit. Past attempts are saved. |
| Flashcards | Generate from pasted text or a PDF (≤ 10 MB), or add and edit by hand. Duplicates are skipped. |
| Review | SM-2 queue with all six grades (0–5) and the next interval shown on each button. |
| Today | Cards due, streak, today's recall rate, totals, a 7-day forecast and history, and the weakest concepts to explain next. |
| Settings | Language, theme, daily reminder, cards per generation, **export / restore backup**, delete all data. |

Offline, everything works except the two AI actions (explain feedback and card generation).

## Architecture

```
┌──────────────── device ────────────────┐        ┌──── Supabase Edge Functions ────┐
│ screens (expo-router)                   │        │ feynman-evaluate    (stateless) │
│   ↕ React Query hooks  (src/data)       │  HTTPS │ generate-flashcards (stateless) │
│                                         │        │ generate-course     (stateless) │
│   ↕ pure logic         (src/local)      │ ─────▶ │   → OpenAI / Gemini             │
│   ↕ zustand store → SQLite kv / web LS  │        │ no DB, no auth, per-IP limit    │
└─────────────────────────────────────────┘        └─────────────────────────────────┘
```

- `src/local/logic.ts` holds every data operation as a pure function (`LocalDB → LocalDB`): uniqueness, cascading deletes, mastery, SM-2 reviews, stats, backup format. It's fully unit-tested.
- `src/local/store.ts` persists the database with zustand, using the expo-sqlite `localStorage` on iOS/Android and the browser's localStorage on web.
- Any change to the store refreshes the open screens automatically. The review queue is the exception: it stays stable until the session ends.
- The AI functions receive all the context they need (concept title, the lesson text, recent Socratic questions, your cards) in the request, and store nothing.

```
src/app/            screens: onboarding, (app)/index (the single home screen),
                    concept/[id]/{index,explain,generate}, card/[id], session/[id], study
src/features/home/  home sections: Today, Learning paths, Library, Progress, Settings
src/content/        built-in courses (Hebrew) and the course type
src/local/          LocalDB types, pure logic, persisted store
src/data/           React Query hooks over the local store + AI calls
src/api/functions   client for the two AI functions
src/services/       daily reminders, backup export/import
supabase/functions/ stateless AI Edge Functions (Deno)
supabase/migrations/  Postgres schema + RLS, NOT used by the current local-only app;
                      kept for a future optional cloud sync
```

## Setup

### App

```bash
npm install
npm start          # press w for web, or scan with a development build
```

That's all you need for the library, manual cards and reviews.

### AI features (optional)

Step-by-step guide (Hebrew): **[docs/AI-SETUP.md](docs/AI-SETUP.md)**. In short:

```bash
npx supabase link --project-ref <ref>
npx supabase secrets set LLM_PROVIDER=gemini GEMINI_API_KEY=...   # or LLM_PROVIDER=openai OPENAI_API_KEY=...
npx supabase functions deploy feynman-evaluate --no-verify-jwt
npx supabase functions deploy generate-flashcards --no-verify-jwt
npx supabase functions deploy generate-course --no-verify-jwt
```

Then in the app: **Settings → AI connection**, paste the project URL and publishable key and press
*Save and test*. The values are stored on the device, so a released APK can be connected without
rebuilding. (Alternatively bake them in at build time via `.env.local`.) No database is needed.

> **Cost and abuse:** with no accounts, the AI functions are public. They only have a best-effort
> in-memory limit per IP (30 explanations, 15 card generations and 10 course maps per hour). Set a
> spending cap with your AI provider before sharing the app.

Reminders use `expo-notifications`, so test them in a development build
(`npx expo run:ios|android` or `eas build --profile development`).

## Checks

```bash
npm run typecheck          # tsc (with typed routes)
npm run lint               # expo lint
npm test                   # jest: local data logic, SM-2, grades, i18n completeness, errors, formatting
npm run test:functions     # Deno: AI function services, LLM client, rate limit, chunking
npm run check:functions    # Deno type-check
npx expo-doctor
```

## Data safety

- **One device only:** data lives on this device. Uninstalling the app or clearing its storage deletes it. Use **Settings → Export backup** to keep a copy or move to another device, and **Restore from backup** to load one.
- **Delete all my data** wipes the local library and drafts.
