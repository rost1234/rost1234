"""נקודת הכניסה למשחק. הרצה:  python main.py   (אפשר להוסיף --rtl או --no-rtl)"""
import os
import sys

import display as d
from engine import Game, list_stories, load_found_endings, save_path, story_endings
from player import CLASSES, Player

MAX_REROLLS = 2


def create_player():
    print()
    d.title("יצירת דמות")
    d.say("מה שמך, הרפתקן?")
    name = d.ask("> ") or "הרפתקן"

    keys = list(CLASSES)
    while True:
        d.say("בחר מקצוע:")
        for i, k in enumerate(keys, 1):
            d.say(f"{i}. {CLASSES[k]['name']} - {CLASSES[k]['desc']}")
        ans = d.ask("> ")
        if ans.isdigit() and 1 <= int(ans) <= len(keys):
            cls = keys[int(ans) - 1]
            break

    player = Player(name, cls)
    rerolls = MAX_REROLLS
    while True:
        print()
        d.say("מטיל קוביות לתכונות...", d.GRAY)
        for line in player.roll_stats():
            d.say(line)
        player.show_status()
        player.show_inventory()
        if not rerolls:
            d.pause()
            return player
        d.say(f"1. יוצאים לדרך!   2. הטל מחדש (נשארו {rerolls})")
        if d.ask("> ") != "2":
            return player
        rerolls -= 1


def pick_story(stories, only_saved=False):
    """תפריט בחירת סיפור. מחזיר סיפור או None."""
    if only_saved:
        stories = [s for s in stories if os.path.exists(save_path(s["id"]))]
        if not stories:
            d.say("אין משחק שמור.", d.RED)
            return None
    if len(stories) == 1:
        return stories[0]
    print()
    d.title("בחר הרפתקה")
    found = load_found_endings()
    for i, st in enumerate(stories, 1):
        total = len(story_endings(st))
        got = len(found.get(st["id"], []))
        d.say(f"{i}. {st['title']}  ({got}/{total} סופים)", d.BOLD)
        if st.get("intro"):
            d.say(f"   {st['intro']}", d.GRAY)
    d.say("0. חזרה")
    while True:
        ans = d.ask("> ")
        if ans == "0":
            return None
        if ans.isdigit() and 1 <= int(ans) <= len(stories):
            return stories[int(ans) - 1]


def endings_book(stories):
    """ספר הסופים: אילו סופים כבר גילית בכל סיפור."""
    found = load_found_endings()
    print()
    d.title("ספר הסופים", d.CYAN)
    for st in stories:
        endings = story_endings(st)
        got = found.get(st["id"], [])
        d.say(f"{st['title']} - {len([p for p, _ in endings if p in got])}/{len(endings)}", d.BOLD + d.YELLOW)
        for pid, kind in sorted(endings, key=lambda e: (ENDING_ORDER.index(e[1]) if e[1] in ENDING_ORDER else 9, e[0])):
            label = ENDING_NAMES.get(kind, kind)
            if pid in got:
                page = st["pages"][pid]
                name = page.get("ending_title") or page["text"].split(".")[0][:60] + "..."
                d.say(f"  [v] {label}: {name}", d.GREEN)
            else:
                d.say(f"  [ ] {label}: ???", d.GRAY)
        print()
    d.pause()


ENDING_ORDER = ["true", "win", "alt", "bad", "death"]
ENDING_NAMES = {"true": "הסוף האמיתי", "win": "ניצחון", "alt": "סוף אחר", "bad": "סוף רע", "death": "מוות"}


def main():
    d.setup_console()
    d.load_settings()
    if "--rtl" in sys.argv:
        d.settings["rtl"] = True
    elif "--no-rtl" in sys.argv:
        d.settings["rtl"] = False
    elif d.settings.get("rtl") is None:
        d.calibrate()

    stories = list_stories()
    while True:
        print()
        d.title("ספרי-משחק: הרפתקאות בעולם הצללים")
        d.say(f"{len(stories)} הרפתקאות מחכות לך", center=True)
        print()
        d.say("1. משחק חדש")
        d.say("2. טען משחק שמור")
        d.say("3. ספר הסופים")
        d.say("4. כיול תצוגת עברית")
        d.say("5. יציאה")
        ans = d.ask("> ")
        if ans == "1":
            story = pick_story(stories)
            if story:
                print()
                d.title(story["title"])
                if story.get("intro"):
                    d.say(story["intro"], center=True)
                game = Game(story, create_player())
                game.start()
                game.run()
        elif ans == "2":
            story = pick_story(stories, only_saved=True)
            if story:
                Game(story, Player.load(save_path(story["id"]))).run(fresh=False)
        elif ans == "3":
            endings_book(stories)
        elif ans == "4":
            d.calibrate()
        elif ans in ("5", "q"):
            d.say("להתראות, הרפתקן!")
            return


if __name__ == "__main__":
    frozen = getattr(sys, "frozen", False)
    try:
        main()
    except KeyboardInterrupt:
        print()
    except Exception:
        import traceback
        traceback.print_exc()
        if frozen:  # בלחיצה כפולה החלון נסגר מיד - נותנים זמן לקרוא את השגיאה
            input("Error - press Enter to close / שגיאה - לחץ Enter לסגירה")
