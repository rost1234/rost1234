# FeynmanMind

Active learning with the **Feynman Technique** and **spaced repetition (SM-2)**.
Explain a concept in plain words, get one Socratic question back from an AI tutor
(never the answer), and turn notes or PDFs into flashcards that come back just
before you'd forget them.

Expo (React Native, iOS / Android / web) · Supabase (Postgres + RLS + Edge Functions) · OpenAI or Gemini.
English and Hebrew (RTL), light and dark themes.

## Features

| Area | What it does |
|---|---|
| No sign-in | The app opens straight into the library. Each device gets a private Supabase anonymous user on first launch. "Delete all my data" in Settings wipes it and starts fresh. |
| Library | Subjects → concepts. Create, rename, delete. Mastery bar per subject. |
| Feynman tutor | Write an explanation (drafts are kept per concept). Get a score, verdict, one Socratic question, jargon to unpack and misconceptions, without being told the answer. Revise and resubmit. Past attempts are saved. |
| Flashcards | Generate from pasted text or a PDF (≤ 10 MB), or add and edit by hand. Duplicates are skipped. |
| Review | SM-2 queue with all six grades (0–5) and the next interval shown on each button. Safe across devices. |
| Today | Cards due, streak, today's recall rate, totals, a 7-day forecast and history, and the weakest concepts to explain next. |
| Settings | Language (device / English / Hebrew), theme, daily reminder time, cards per generation, delete all my data. |

## Project layout

```
src/app/                  expo-router screens
  _layout.tsx             providers, RTL, onboarding gate (Stack.Protected), silent anonymous sign-in
  onboarding.tsx
  (app)/(tabs)/           Today · Library · Review · Settings
  (app)/subject/[id]      concepts in a subject
  (app)/concept/[id]/     concept hub · explain (Feynman) · generate (cards)
  (app)/card/[id]         create / edit a flashcard
  (app)/session/[id]      a past explanation + feedback
  (app)/study             review session
src/data/                 React Query hooks per table/RPC
src/srs/                  SM-2 (sm2.ts), review submission, grade previews
src/api/functions.ts      typed Edge Function client
src/components/, theme/, i18n/, lib/, services/reminders.ts, state/
supabase/migrations/      schema, RLS, triggers, review_logs, RPCs
supabase/functions/       feynman-evaluate · generate-flashcards · delete-account
```

## Setup

### 1. Supabase

```bash
supabase link --project-ref <ref>
supabase db push                                   # both migrations
supabase secrets set LLM_PROVIDER=openai OPENAI_API_KEY=...
#   or: LLM_PROVIDER=gemini GEMINI_API_KEY=...
supabase secrets set LLM_MODEL=...                 # optional; defaults gpt-4o-mini / gemini-2.5-flash
supabase functions deploy feynman-evaluate
supabase functions deploy generate-flashcards
supabase functions deploy delete-account
```

**Enable anonymous sign-ins:** turn on **Authentication → Sign In / Providers →
Allow anonymous sign-ins** (locally: `[auth] enable_anonymous_sign_ins = true`).
There is no sign-in screen, so the app can't start without it.
Anonymous users get the `authenticated` role and their own `auth.uid()`, so
every RLS policy works unchanged. To limit abuse, keep Supabase's per-IP rate
limit for anonymous sign-ins and consider enabling CAPTCHA (Turnstile/hCaptcha).

### 2. App

```bash
cp .env.example .env.local     # set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npm install
npm start                      # Expo dev server (press w for web)
```

Without these values the app shows a setup screen instead of failing.
Reminders use `expo-notifications`, so test them in a development build
(`npx expo run:ios|android` or `eas build --profile development`).

### 3. Builds

`eas.json` has development, preview and production profiles
(`npx eas-cli@latest build --profile production`).

## Checks

```bash
npm run typecheck          # tsc
npm run lint               # expo lint
npm test                   # jest: SM-2, grades, i18n completeness, errors, formatting
npm run test:functions     # Deno: Edge Function services, LLM client, chunking
npm run check:functions    # Deno type-check
npx expo-doctor
```

## How the data stays safe and consistent

- **Access rules:** RLS on every table. Ownership flows from `subjects.user_id`, and triggers stop flashcards or reviews being attached to someone else's rows.
- **Scores can't be faked:** clients can't write AI fields. The `feynman-evaluate` function writes them with the service role.
- **Reviews:** `submit_card_review` saves the SM-2 result and a `review_logs` entry in one transaction. It only applies if the card hasn't changed since it was fetched, so grading the same card on two devices counts once.
- **Dashboard:** `get_study_stats` computes due counts, streak, forecast and history in the user's time zone.
- **Data deletion:** "Delete all my data" deletes the anonymous user, which removes all their rows via `ON DELETE CASCADE`.
- **Data lives with the device:** there's no account to sign back into, so uninstalling the app or clearing its storage loses access to that library.
- **Limits:** 30 evaluations and 300 generated cards per user per hour. One retry on AI errors.
