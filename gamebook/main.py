"""נקודת הכניסה למשחק. הרצה:  python main.py   (אפשר להוסיף --rtl או --no-rtl)"""
import os
import sys

import display as d
from engine import Game, SAVE_FILE, load_story
from player import CLASSES, Player

STORY_FILE = os.path.join(d.BASE_DIR, "story", "adventure.json")


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
    while True:
        print()
        d.say("מטיל קוביות לתכונות...", d.GRAY)
        for line in player.roll_stats():
            d.say(line)
        player.show_status()
        player.show_inventory()
        d.say("1. יוצאים לדרך!   2. הטל מחדש")
        if d.ask("> ") != "2":
            return player


def main():
    d.setup_console()
    d.load_settings()
    if "--rtl" in sys.argv:
        d.settings["rtl"] = True
    elif "--no-rtl" in sys.argv:
        d.settings["rtl"] = False
    elif d.settings.get("rtl") is None:
        d.calibrate()

    story = load_story(STORY_FILE)
    while True:
        print()
        d.title(story["title"])
        d.say(story.get("intro", ""), center=True)
        print()
        d.say("1. משחק חדש")
        d.say("2. טען משחק שמור")
        d.say("3. כיול תצוגת עברית")
        d.say("4. יציאה")
        ans = d.ask("> ")
        if ans == "1":
            Game(story, create_player()).run()
        elif ans == "2":
            if os.path.exists(SAVE_FILE):
                Game(story, Player.load(SAVE_FILE)).run(fresh=False)
            else:
                d.say("אין משחק שמור.", d.RED)
        elif ans == "3":
            d.calibrate()
        elif ans in ("4", "q"):
            d.say("להתראות, הרפתקן!")
            return


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print()
