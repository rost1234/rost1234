# Device test checklist

Run on a real Android phone before sharing a new APK. Install **over** the previous build — never uninstall first (that wipes local data).

## Update safety
- [ ] New APK installs as an update over the previous one (no "App not installed" error)
- [ ] After updating, habits, streaks, tasks and reflections are all still there

## Backup
- [ ] Settings → Export backup opens the share sheet; save the file (e.g. to Drive/Files)
- [ ] Settings → Restore from backup → pick that file → the summary counts look right
- [ ] Cancel leaves everything unchanged
- [ ] Replace restores the data and returns to the Today screen
- [ ] Picking a non-Momentum file shows an error and changes nothing

## Phase 1
- [ ] After updating from build 2, existing habits/tasks are intact (DB migrates to v2)
- [ ] Add 4 tasks: the 4th goes to Later (hint shown); counter shows 3/3
- [ ] Check one off → a new task goes to today again
- [ ] Tasks from yesterday show a "Decide" card → Today / Later / Drop each work; Today is disabled when full
- [ ] More ▸ shows Later tasks (→ Today / ✕) and, before 17:00, the reflection card
- [ ] Long-press habit → Edit habit: change the target (e.g. 4 → 2) → today's card updates, streak kept

## Phase 2 — home-screen widget
- [ ] Long-press the home screen → Widgets → Momentum → "Momentum — Today" can be added
- [ ] Widget shows today's date, % and today's habits (open ones first); resize taller → more rows
- [ ] Tap a binary habit on the widget → ✓ and the % update within a second or two
- [ ] Tap a count habit → 1/4 → 2/4 …
- [ ] Open the app → the dashboard shows the same progress (and vice versa: tap in app → widget updates)
- [ ] Tap the date/percent header → the app opens
- [ ] Dark mode on the phone → widget switches to dark colours
- [ ] Before onboarding, the widget says "Tap to set up"

## Phase 3
- [ ] Insights → "Screen time" shows today's time in Momentum (grows while the app is open, stops when it's closed)
- [ ] Settings → Reminder: switch off/on; −/+ moves the time in 15-min steps; the reminder fires at the chosen time
- [ ] With notifications blocked, changing the reminder shows the "notifications are blocked" note

## Swipe & focus sounds
- [ ] Swipe left/right moves between Today → Focus → Insights → Settings; the bottom bar follows
- [ ] Horizontal lists (focus chips, sound chips, heatmap) still scroll without switching tabs
- [ ] Focus → pick Brown noise → Start: sound plays and loops with no click; Pause stops it, Resume restarts it
- [ ] Change sound / volume during a session → switches immediately
- [ ] Lock the phone for 5+ minutes → the sound keeps playing (media controls appear on the lock screen)
- [ ] Finish or Cancel → sound stops. Another app's music isn't stopped when the session starts
- [ ] 40 Hz binaural with headphones: left and right tones differ
- [ ] Rain / Ocean: no audible "seam" when the 45-second loop repeats
- [ ] Sound fades in on start, fades out on pause/finish, and crossfades when switching sounds
- [ ] Switching between sounds keeps roughly the same loudness

## Look & feel
- [ ] Today: gradient header with greeting, date, ring and freeze count
- [ ] Checking a habit: short vibration, check pops in; completing the target gives a "success" vibration
- [ ] Focus tab: dark screen, light status bar; other tabs go back to a dark status bar
- [ ] Tab bar icons; the active tab has a highlighted pill (dark variant on Focus)

## Wave 1 — quick wins
- [ ] Tap a habit → a dark toast "Water: +1 glasses · UNDO" appears for ~4 s; UNDO restores the previous state
- [ ] First launch after update: 3 tips on Today (Next / Skip); they never come back after "Got it"
- [ ] With no habits: 3 one-tap starters appear; tapping one adds it immediately
- [ ] New habit → "Start from a template": Sleep / Study / Fitness / ADHD groups pre-fill the form
- [ ] "Why it matters" field saves; long-press the habit shows "Why: …"; Focus on that habit shows the quote
- [ ] A habit with past completions but a broken streak shows a green "Fresh start" badge
- [ ] Insights heatmap cells show ✓ ◐ ❄ – · symbols (legend too)
- [ ] Settings → "Your data stays on this phone" expands to the stored / never-collected lists
- [ ] Focus → Mode "Pomodoro 25/5 ×4": ring turns green in breaks, pill shows "Focus 1/4" / "Break 1/4";
      close the app for 35 min and reopen → it has moved on correctly; notifications fire at each change
- [ ] Focus → "Turn on Do Not Disturb" opens the system DND settings

## Wave 2 — Atomic Habits & hard days
- [ ] Edit a count habit → Atomic habits → "Grow": set goal 20, step 2; a yes/no habit switched to Grow becomes "2 min"
- [ ] After a strong week (6+ of 7 days) a "Level up …?" card appears on Today; "Go to N" raises the target, "Not now" hides it for 7 days
- [ ] 3+ misses in a week → "Make … easier?" card; at the goal → "Goal reached" → "Keep it here" switches to Maintain
- [ ] "When & where" shows under the habit title; "Stack it after…" places it right after its anchor with "↳ after …"
- [ ] "Low-energy day?" pill: when on, one tap completes any habit (also from the widget); turn off → normal again
- [ ] Settings → Breaks: pause 3 days from today → Today shows the vacation banner; missed days don't break streaks,
      no freezes are used, and the heatmap shows them as "–"; ✕ ends the pause

## Wave 3 — Hebrew/English, dark mode, icon
- [ ] New app icon on the launcher (purple gradient, rising bars) and a purple splash screen (dark splash in dark mode)
- [ ] Phone in Hebrew → the app opens in Hebrew and right-to-left (tabs, chips, habit cards mirrored)
- [ ] Settings → Appearance → Language: switch to English/עברית; text changes at once; if direction must change,
      a "close and reopen" note appears — after reopening the layout direction matches
- [ ] Dates and weekday names follow the language (e.g. "יום ה׳, 24 בספט׳")
- [ ] Settings → Appearance → Theme: System / Light / Dark switch instantly; system dark mode is followed live
- [ ] Dark mode: all screens readable (cards, chips, heatmap, charts, modals' headers, status bar)
- [ ] Notifications, widget texts and template habits appear in the chosen language
- [ ] Large system font: timer, tab labels and header percent stay inside their space

## Core loop
- [ ] Fresh install shows onboarding; completing it lands on Today with the chosen habits
- [ ] Tapping a binary habit toggles instantly; a count habit goes 1/4 → 4/4 and turns green
- [ ] Long-press a habit → Skip / Reset / Archive work
- [ ] Add a task, check it, long-press to delete
- [ ] Focus: start 15 min, lock the phone for a minute, unlock — the time is correct
- [ ] Focus: pause/resume, finish early → "Session logged"; notification plays when the timer ends in background
- [ ] Reflection: 3 steps save; reopening shows the saved answers
- [ ] Insights: week/month switch, heatmap and trend charts render
- [ ] Leave the app open across midnight (or change the date) → Today refreshes to the new day
