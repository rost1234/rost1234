---
name: boss-music
description: Write a short adventure story about heroes fighting their way to a boss, then compose and render the boss fight's music in stages from the boss's traits (instruments, mood, tempo, number of stages all derived from the story), using the sampled orchestra from GuySten/Claude-Code-Game-Master. Use whenever the user asks for boss music, battle or fight music from a story, a new "set" (story + boss stages), or to fix or revise a stage they listened to - even if they only say "make another one" or describe a sound they disliked.
---

# Boss music from a story

The rules for *what* to write live in `GUIDELINES.md` (Hebrew, next to this file). Read it
whole before composing. Each rule there is tagged by where it came from: **[נשמע]**
(the user confirmed it by ear) outranks **[עבד]** (it was in a liked version) which
outranks **[הנחה]** (untested). The user's ears are final; this file is only *how*.

Talk to the user in their language (Hebrew so far).

## 1. Set up the orchestra (once per container)

```bash
SP=<your scratchpad>          # never inside the repo
git clone --depth 1 https://github.com/GuySten/Claude-Code-Game-Master.git $SP/ccgm
cd $SP/ccgm && bash tools/gm-music.sh setup          # ~215 MB of recordings, ~1 min
```

Extra sound sets (choirs, solo voice, real percussion, brass) download by themselves on
the first render that uses them - run that first render in the background.
The project is CC BY-NC-SA 4.0 (non-commercial): we only run it, never copy its code here.

Render through this skill's wrapper, which adds a `piano` and a GM `drums` kit
(General MIDI drum numbers: 36 kick, 37 rim, 38 snare, 41/45 toms, 42 closed hat,
46 open hat, 49 crash, 51 ride) without touching the project's files:

```bash
PY=$SP/ccgm/.music-venv/bin/python
W=<repo>/.claude/skills/boss-music/scripts/run_score.py
$PY $W $SP/ccgm/lib check music/<boss>/stage1.json                     # technical check
$PY $W $SP/ccgm/lib play  music/<boss>/stage1.json --out $SP/stage1.ogg
ffmpeg -loglevel error -y -i $SP/stage1.ogg -b:a 192k music/<boss>/stage1.mp3
```

The score format is documented at the top of `$SP/ccgm/lib/music/arrangement.py`
(look things up there; don't read it through). Write scores as sketches:
`"tune": {"seed": "<boss>", "mode": "minor", "key": "D4", "meter": "4/4"}`,
`"statements": []`, the motif in `"motifs"`, placed in `"lines"` with `"lead": true`.

## 2. The steps

1. **Story** - heroes, the road to the boss, the boss's past and motive, and the fight's
   phases. Short: a few paragraphs. A new set gets a new world, new heroes and a new
   boss - don't reuse the previous boss's symbol, key colour or tempos.
2. **Traits -> music table** (GUIDELINES section 2) - one audible element per trait.
3. **Stages** = the story's fight phases (section 4); plan each stage in one line:
   tempo, engine, who carries the motif, the breakdown, the peak, the ending.
4. **Motif** (section 3) - 2 bars + an answer, and a variant answer that lands home.
5. **Write each stage**, then `check` until 0 errors and 0 warnings - but only act on
   *technical* findings (range, a part too quiet, the lead not on top, notes that
   smear, a glued-on join). Its taste advice (state the tune once, a one-beat climax,
   an open ending...) is overruled by GUIDELINES section 7.
6. **Render** all stages (background), convert to MP3, measure the level per 5 s to
   confirm the shape you planned (quiet opening, long loud peak, clear ending).
7. **Write `music/<boss>/README.md`** in the user's language: the story, the traits
   table, each stage's idea with timestamps of what to listen for.
8. **Commit, push, and send** the README and the MP3s with SendUserFile. Say plainly
   that you can't hear audio: the checks are technical, the user's ears decide.

## 3. When the user listens

- Convert a timestamp to beats (`seconds * tempo / 60`) and find what plays there
  before guessing.
- Fix only what they named; save the fix as a new version (`stage2-v3.json/.mp3`),
  keep the old one.
- Turn every remark - a fault or a praise - into one rule in `GUIDELINES.md` with the
  **[נשמע]** tag, replacing any older rule on the same point. Commit it with the fix.

## Engine gotchas (learned the hard way)

- A `"rolls"` entry is separate strokes (~5 a second), not a smooth roll: it only works
  leading *into* a hit; into a peak use a `reverse_cymbal` hit ending on the downbeat.
- `bells` range is C4-F5; `solo_voice` notes must be 1 s or longer and it is meant for a
  boss's last stage (give that score `"stage": 3`); `men_choir` stays at E4 and below.
- Quick string notes: keep `"legato"` low so each note is under 0.3 s, or they smear.
- `root5` with a pattern that re-strikes while the last note rings: lower `"legato"`.
- The lead needs `"gain"` until `check` stops warning that it isn't on top.
