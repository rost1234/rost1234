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
