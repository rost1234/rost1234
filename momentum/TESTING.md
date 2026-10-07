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

## Wave 4 — insights, weekly summary, milestones, rhythm
- [ ] Today shows "Today's insight" (tap to expand: action, caveat, source link, evidence level); same card all day;
      in Hebrew the card text is Hebrew
- [ ] First open in a new week (Sunday) with at least a week of history → "Your week" summary opens once
- [ ] Reaching a 7-day streak on a habit → a short celebration (🔥) with a vibration; it doesn't repeat for that milestone
- [ ] Habit form → Part of the day (Morning/Afternoon/Evening): Today shows the current part of the day first
- [ ] Habit form → Smart reminder on (permission asked): a reminder arrives around the usual time with a "Done ✓" button;
      tapping it marks the habit done (app closed too — at the latest when the app next opens); no reminder once done

## Wave 5 — focus extras, shortcuts, focus widget, privacy
- [ ] Focus → pick Rain, then "Layer a second sound" → Brown noise: both play; each has its own Low/Medium/High volume;
      tapping the second sound again removes it; the old single-sound choice was kept after the update
- [ ] Insights → "Your sound experiment": after sessions with and without sound it shows % finished as planned and
      average minutes; under 5 sessions per group it says there isn't enough data yet
- [ ] Long-press the app icon → Focus 25 min (opens Focus and starts), Evening reflection, Add task (quick form)
- [ ] Add the "Momentum — Focus" widget → ▶ starts 25 min without opening the app (notification at the end);
      the widget shows "Focusing · until HH:MM"; opening the app shows the running timer and starts the sound
- [ ] Settings → Weekly auto-backup → choose a folder: a backup file appears there right away; "Back up now" adds
      today's file; a week later, opening the app writes a new one
- [ ] Settings → Lock reflections (confirms with fingerprint/PIN): opening the reflection asks to unlock; it stays
      unlocked until the app goes to the background

## Navigation without tabs
- [ ] Home has ⚙️ (Settings) and 📚 (Library) at the top, and a "▶ Focus" button floating at the bottom; there is no tab bar
- [ ] Tapping the progress ring opens Insights; ✕, swipe down or Android back returns to Home
- [ ] Focus opens full screen; ⌄ returns Home while the session keeps running and the button shows "Focus · 12:34 left"
- [ ] Library lists all research cards with topic filters; tapping a card shows the action, caveat and source
- [ ] The app-icon shortcuts and the Focus widget still open Focus

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

## Smart notifications, main task, bottom buffer
- [ ] Every screen (Home, Insights, Settings, Library, Focus, habit form, reflection, weekly) scrolls until the last item
      is fully visible above the navigation bar; on Home it also clears the ▶ Focus button
- [ ] The Undo toast appears above the ▶ Focus button, not on top of it
- [ ] Settings → Notifications → Smart notifications: "Coming up" lists the next reminders; ticking a habit on Home removes
      its reminder from the list
- [ ] Two habits with smart reminders at a similar time arrive as one notification ("2 habits are waiting")
- [ ] Quiet hours 22:00–07:00: a habit usually done at 23:00 is reminded at 21:45
- [ ] Most per day = 1 with reflection reminder on → only the reflection reminder is listed for that day
- [ ] Streak rescue: a habit with a 3+ day streak not done today → one notification at 20:30 with "Done ✓"; done earlier → none
- [ ] Morning plan on → next morning "Good morning ☀️ · N habits today. First up: …"
- [ ] Reflection written today → no evening reminder today; tomorrow's is still listed
- [ ] With notifications blocked the card says so and "Allow notifications" asks again
- [ ] After updating, the old daily reflection reminder doesn't fire twice (legacy reminders are replaced)
- [ ] Long-press a task → "⭐ Make it today's main task": it moves to the top with a ⭐ Main tag; long-press again → remove;
      tomorrow it is no longer marked

## Streak protection & monthly calendar
- [ ] Tap the 🧊 freezes pill on Home → "Streak protection" opens: balance (❄❄◌), progress "n of 7 perfect days", and
      recent uses (date · habit · streak kept)
- [ ] Settings → Streaks → the card shows the freeze count (and "Paused until …" during a pause) and opens the same screen
- [ ] New pause: pick reason, step From/To day by day (From can't go before today, To can't go before From), "Add pause ·
      N days" → it appears as an upcoming pause; ✎ loads it into the form, 🗑 asks before deleting
- [ ] During an active pause started yesterday: "End today" → yesterday stays ✈ in the calendar and the heatmap, today is
      a normal day, and no freeze is used for yesterday on the next open
- [ ] "Extend by a day" moves the end date by one day; the Home banner (tap → Streak protection) shows the new date
- [ ] Insights → "Monthly calendar": rings fill per day, perfect days are green, ❄ badge on frozen days, ✈ band over
      paused days, today outlined; ‹ › change months (no future months)
- [ ] Habit chips filter the calendar to one habit; tapping a day opens its sheet with every habit's status, focus minutes
      and mood
- [ ] Hebrew: weekdays start on Sunday at the right, arrows point the right way; dark mode looks right
- [ ] Long-press a habit → "Pause this habit" → Streak protection opens with that habit selected under "Applies to";
      add the pause → the habit card shows "⏸ until …", its reminders and check-in stop, the other habits go on as usual
- [ ] In the calendar that day isn't banded for "All habits"; filter to the paused habit → the ✈ band appears
- [ ] Deleting a habit also removes its single-habit pauses; an update from the previous version keeps old pauses app-wide

## Settings list
- [ ] ⚙️ opens a short list: General (Appearance & language, Notifications), Streaks (Streak protection), Your data
      (Backup & restore, Privacy); each row shows its current state and opens its own screen; ✕ / back returns to the list
- [ ] Change theme or quiet hours, go back → the row's status line shows the new value
- [ ] Backup & restore: export, restore (with the confirmation) and weekly auto-backup still work; a failed auto-backup
      shows in orange on the list

## Agent-review fixes (build 25)
- [ ] Leave the app open on Today past midnight (or reopen next morning): the day's insight card changes; after a mood of 1–2 in
      yesterday's reflection it's a low-mood card; after giving up a focus session, a missed-focus card
- [ ] App-wide vacation pause today → no evening reflection reminder in Settings → Notifications → "Coming up"; with only one
      habit paused it's still listed
- [ ] Start a pause today, tap "Resume today" → "Remove this pause?" dialog; the other button keeps it
- [ ] Calendar: an archived habit shows only on days it was logged and isn't in the filter chips; with a habit filter, the
      day sheet lists only that habit
- [ ] Onboarding: picking a goal pre-selects exactly one habit
- [ ] Weekly summary shows "Insight of the week" (not the same card as that week's first daily card)
- [ ] Settings list with a daily limit of 1 reads "Up to 1 reminder a day"; Home freeze pill with one freeze reads "One freeze"

## Day-off Home & notification Done (build 26)
- [ ] "Done ✓" on a habit notification with the app fully closed → the notification disappears right away; open the app → the
      habit is marked; a later rescue / "Did you already?" for only that habit is gone from Settings → Notifications → "Coming up"
- [ ] Same with the app in the background and in the foreground
- [ ] After "Done ✓" (app closed), Settings → Notifications shows "Last “Done ✓” from a notification (background): <time> ✓";
      if the notification stayed, note whether this line appeared at all, and whether it says background or in app
- [ ] Mark a habit done in the app while its reminder is still showing → open the app again: the reminder is gone
- [ ] On a Friday or Saturday (Hebrew) → Home header is light blue–purple with "🏖 סופ״ש"; habits first; "3 של היום" is one
      dashed line with the open count; tapping it opens the tasks
- [ ] Settings → Days off: turn it off → Home looks like a regular day; pick other weekend days → Home follows; the list row
      shows the chosen days
- [ ] Start an app-wide vacation pause today → pill "✈ חופשה"; a sick pause or a single-habit pause → regular Home
- [ ] A regular weekday → Home unchanged (no pill, tasks open as before)

## Motivation (build 29)
- [ ] Tap a habit → toast "Done ✓ · time #N"; long-press → "So far: N small choices"
- [ ] Weekly summary → "Your path" card with the total, last week and the yearly pace
- [ ] Break a streak, then do the habit 1–6 days → "26/30 past month" beside the streak; gone at 7
- [ ] Don't open the app or use the widget for 5+ days → "Good to have you back" card; no missed-day count; old tasks move to Later
- [ ] 30-day milestone with a reflection from the habit's first days → "📝 A note from day one" opens on tap (after unlocking if locked)
- [ ] A habit 66+ days old with a streak → one question a day at most; 4–5 offers to turn off the reminder
- [ ] Fresh install → after the tips, "First win" card once; "Did it ✓" marks the habit and shows 🌱
- [ ] Update from build 28 → no First win card
- [ ] On the 1st of the month with a broken habit → fresh-start card in the insight slot; "Archive it" asks first
- [ ] Complete a habit from the widget → its notifications for today disappear

## From the LOCKIN sheet (build 30)
- [ ] New habit → turn on "A habit to quit" → no count/grow/reminder fields; "What to do instead?" shows on the card; ✓ reads "A day without ✓"
- [ ] A quit habit never appears in Settings → Notifications → "Coming up"
- [ ] Evening reflection → pick sleep hours (tap again to clear) → Insights shows the Sleep card; after 3+ nights each side, the mood comparison
- [ ] Morning, with a habit not logged yesterday → "Anything else from yesterday?" → tap → yesterday counts, streak updates; after 13:00 the card is gone
- [ ] If a freeze covered yesterday, marking it done gives the freeze back (Home pill)
- [ ] Home → More → "A letter to my future self" → write, pick "in a month", seal → shows as sealed; with the reflection lock on, the screen asks to unlock
- [ ] Set the phone date past the opening day → 📬 card on Home → opens the letter; the card is gone after reading
- [ ] Backup → restore: quit habits, sleep hours and letters come back

## Quit habits: urge moment (build 31)
- [ ] Update from build 30 → old habits, quit habits, reflections and letters are all still there
- [ ] Edit a quit habit → "When…" and "Then… what to do instead?" → the card reads "after a meal ← wash my face"
- [ ] Fill "What did it cost a day?" (₪ and minutes) → after a ✓ day the card shows "Saved ₪… · …"; leave both empty → no line
- [ ] Quit habit card → "Urge now" → plan and why show → "Sit with it 10 minutes" → lock the phone → one notification at the end
- [ ] Tap that notification (app closed) → Home opens "did it pass?" once → "It passed ✓" → "The first urge that passed this month"
- [ ] "Not this time" → a kind line only (with "x of y days" when there is a month of data); pick a trigger chip, tap again to clear
- [ ] "It passed already ✓" during the timer stops the end notification; "Leave without logging" saves nothing
- [ ] Insights → "Habits to quit": saved, time back, urges passed; under 10 entries a "N more" line; at 10+ the urge map, top triggers and (with sleep logged) the sleep line
- [ ] Backup → restore: urge entries and the cost fields come back

## Calm look (build 32)
- [ ] Fresh launch → a brief skeleton, then the app in Assistant (Hebrew letters look the same weight in titles, body and buttons); nothing in the old system font
- [ ] Home, Insights, Settings, a habit card, a sheet → flat cards with a thin outline, no shadows, blue-teal accents; Home header is a blue gradient
- [ ] Dark mode (Settings → Appearance) → dark teal background, readable text everywhere, done habit card is dark green not white
- [ ] Bold and light text: card titles bold, the focus clock thin, quit-habit "Saved …" line bold; text inside a sentence (e.g. a bold word inside a paragraph) keeps its weight
- [ ] Type in a text field (habit name, letter) → the typed text is Assistant too, Hebrew and English
- [ ] Largest system font size → nothing clipped on Home and the urge screen
- [ ] Focus screen and the home-screen widgets keep their own colors (not changed in this build)

## Calendar: what you did that day (build 33)
- [ ] Calendar → tap a past day → sheet shows habits, tasks (done ones with a check), the reflection text and focus minutes
- [ ] A day with a reflection and the reflection lock on → "Open the reflection" → fingerprint/PIN → text shows; a day without one says so
- [ ] Tap the pencil next to a habit that was missed → "Mark done" → the pill, the ring, the month summary and the streak on Home all update
- [ ] A habit with a count: "+1" and "-1" move the count; at the target it becomes done; "Clear the mark" resets it
- [ ] "Skip this day" and "Undo skip" appear for today only; a day covered by a freeze offers only "Mark done", which returns the freeze (Home pill); "Clear the mark" on it afterwards leaves the freeze count unchanged
- [ ] "Edit the habit" closes the sheet and opens the habit form; coming back, the calendar is current
- [ ] Today and future days: today can be edited; future days don't open
- [ ] A task completed on an earlier day shows on that day; an open task planned for that day shows without a check

