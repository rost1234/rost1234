# Momentum

Local-first, all-in-one self-improvement app designed for **< 5 minutes of screen time a day**.
No account, no login, no network — every byte lives in on-device SQLite.

**Stack:** Expo SDK 57 · React Native · TypeScript (strict) · Expo Router · Zustand · expo-sqlite

## Run

```bash
npm install
npx expo start          # then press i / a (requires a development build for notifications)
npm test                # domain unit tests (streaks, freezes, timer, dates, progress)
npm run typecheck
npm run lint
```

## Architecture (Clean Architecture)

```
src/
  core/          localDate engine (getLocalDeviceDate → YYYY-MM-DD), ids, typed DB errors
  domain/        pure, framework-free logic + models (unit tested)
                 habitSchedule · habitProgress · streaks (smart freezes) · focusTimer · analytics · presets
  data/
    db/          DDL migrations (PRAGMA user_version), connection, row types, mappers
    repositories/ interfaces + SQLite implementations, `inTransaction` unit of work
  services/      notifications, timer persistence (AsyncStorage), streak reconciliation, JSON backup
  state/         Zustand stores (optimistic updates with rollback)
  features/      UI per feature: onboarding · dashboard · habits · focus · reflection · analytics · settings
  components/    theme, primitives, skeleton loaders
  hooks/         useLocalDate (midnight rollover + resume), useNow
  app/           Expo Router routes (thin re-exports of feature screens)
```

## How the phases map to code

| Phase | Where |
| --- | --- |
| 1 · SQLite schema & DAOs | `data/db/schema.ts`, `data/repositories/*`, `core/localDate.ts` |
| 2 · Onboarding wizard + startup guard | `app/index.tsx`, `features/onboarding/*`, `state/settingsStore.ts` (atomic batch insert) |
| 3 · Dashboard & smart streaks | `features/dashboard/*`, `state/habitStore.ts`, `domain/streaks.ts`, `services/streakService.ts` |
| 4 · Stateless focus timer | `domain/focusTimer.ts`, `state/focusStore.ts`, `features/focus/*` |
| 5 · Reflection & analytics | `features/reflection/*`, `features/analytics/*`, `domain/analytics.ts` |
| 6 · Polish | skeletons, `useLocalDate` midnight refresh, `services/backup.ts` JSON export + validated restore (with safety copy), `guardDb` + route `ErrorBoundary` |

## Key behaviours

- **Dates** are always the device's *local* calendar day (`YYYY-MM-DD`), never UTC.
- **Habit taps** update Zustand synchronously (same frame), persist in the background, and roll back with a banner on failure.
- **Streak freezes** (default 2, shared pool): on dashboard load, a run of missed scheduled days right before today that
  interrupts a live streak is written as `forgiven` — one freeze per day — if the pool covers the whole gap. Log writes
  and the freeze deduction commit in a single transaction. `skipped` and `forgiven` days bridge a streak without adding to it.
- **Focus timer** persists only `start_time`, target and pause bookkeeping; remaining time is always
  `target − (now − start − paused)`, so backgrounding, locking or killing the app never drifts it. The completion
  notification is scheduled up-front, so it fires even when the app is suspended.
- **Midnight**: the dashboard reloads automatically at local midnight and whenever the app returns to the foreground on a new day.

## Releases & updates

CI (`.github/workflows/momentum-android-apk.yml`) builds an APK on every push and publishes it as a GitHub release.
`versionCode` = the workflow run number, so each build installs as an update. All builds are signed with the same
key and CI refuses to build if that key changes — a key change would force an uninstall, which deletes local data.
See `TESTING.md` for the on-device checklist.
