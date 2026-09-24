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
