"""מנוע הספר: טוען את הדפים מ-JSON, מציג אותם, מבצע אפקטים, קרבות ובחירות."""
import glob
import json
import os

import display as d
from combat import fight
from dice import roll, fmt
from player import Player, STAT_NAMES

SAVES_DIR = os.path.join(d.BASE_DIR, "saves")
STORIES_DIR = os.path.join(d.RESOURCE_DIR, "story")
ENDINGS_FILE = os.path.join(SAVES_DIR, "endings.json")
MAIN_STORY = "adventure"

HELP = "i מלאי | s מצב | p שיקוי | save שמירה | q תפריט"

ENDINGS = {
    "true": ("*** הסוף האמיתי! ***", d.BOLD + d.YELLOW),
    "win": ("*** ניצחון! ***", d.GREEN),
    "alt": ("*** סוף אחר ***", d.YELLOW),
    "bad": ("*** הסוף... ***", d.MAGENTA),
    "death": ("*** מתת. ההרפתקה הסתיימה ***", d.RED),
}


class QuitToMenu(Exception):
    pass


def load_story(path):
    with open(path, encoding="utf-8") as f:
        story = json.load(f)
    story.setdefault("id", os.path.splitext(os.path.basename(path))[0])
    return story


def list_stories():
    """כל הסיפורים בתיקיית story/ - הסיפור הראשי קודם."""
    stories = [load_story(p) for p in glob.glob(os.path.join(STORIES_DIR, "*.json"))]
    return sorted(stories, key=lambda s: (s["id"] != MAIN_STORY, s["title"]))


def save_path(story_id):
    path = os.path.join(SAVES_DIR, f"{story_id}.json")
    old = os.path.join(SAVES_DIR, "save.json")  # שמירה מגרסה ישנה, לפני שהיו כמה סיפורים
    if story_id == MAIN_STORY and not os.path.exists(path) and os.path.exists(old):
        return old
    return path


def load_found_endings():
    try:
        with open(ENDINGS_FILE, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def record_ending(story_id, page_id):
    found = load_found_endings()
    pages = found.setdefault(story_id, [])
    if page_id in pages:
        return False
    pages.append(page_id)
    try:
        os.makedirs(SAVES_DIR, exist_ok=True)
        with open(ENDINGS_FILE, "w", encoding="utf-8") as f:
            json.dump(found, f, ensure_ascii=False, indent=2)
    except OSError:
        pass
    return True


def story_endings(story):
    """רשימת (מספר_דף, סוג) של כל דפי הסוף בסיפור."""
    return [(pid, pg["ending"]) for pid, pg in story["pages"].items() if pg.get("ending")]


class Game:
    def __init__(self, story, player):
        self.story = story
        self.pages = story["pages"]
        self.player = player
        self.save_file = os.path.join(SAVES_DIR, f"{story.get('id', MAIN_STORY)}.json")
        player.extra_weapons = dict(story.get("weapons", {}))
        player.extra_armor = dict(story.get("armor", {}))

    def start(self):
        """אפקטים של תחילת סיפור (ציוד או מונים מיוחדים לסיפור הזה)."""
        if self.story.get("start_effects"):
            self.apply_effects(self.story["start_effects"])

    # ---------- לולאה ראשית ----------
    def run(self, fresh=True):
        """fresh=False כשטוענים שמירה: לא מפעילים שוב אפקטים וקרב של הדף."""
        pid = self.player.page or self.story["start"]
        try:
            while pid is not None:
                pid = self.play_page(pid, fresh)
                fresh = True
        except QuitToMenu:
            return

    def play_page(self, pid, fresh=True):
        p = self.player
        page = self.pages[pid]
        p.page = pid
        if page.get("text"):  # דף בלי טקסט הוא ממסר שקט (redirect)
            print()
            d.title(f"- דף {pid} -", d.YELLOW)
            d.say(page["text"])
            print()

        if fresh:
            self.apply_effects(page.get("effects", []))
            if not p.alive:
                return self.ending("death")

            if "combat" in page:
                c = page["combat"]
                enemies = c["enemies"] if "enemies" in c else [c]
                result = fight(p, enemies, can_flee="flee" in c)
                if result == "dead":
                    return self.ending("death")
                d.pause()
                return c["win"] if result == "win" else c["flee"]

        if page.get("ending"):
            return self.ending(page["ending"])

        if "redirect" in page:
            # ניתוב אוטומטי: היעד הראשון שהתנאים שלו מתקיימים
            self.hops = getattr(self, "hops", 0) + 1
            if self.hops > 500:
                d.say("שגיאה בסיפור: לולאת ניתוב אינסופית. חוזרים לתפריט.", d.RED)
                raise QuitToMenu
            if page.get("text"):
                d.pause()
            for r in page["redirect"]:
                if self.available(r):
                    return r["goto"]
            return page["redirect"][-1]["goto"]

        return self.choose(page)

    # ---------- אפקטים ----------
    def apply_effects(self, effects):
        p = self.player
        for e in effects:
            t = e["type"]
            if t == "add_item":
                p.inventory.append(e["item"])
                d.say(f"+ קיבלת: {e['item']}", d.GREEN)
            elif t == "remove_item":
                if e["item"] in p.inventory:
                    p.inventory.remove(e["item"])
                    d.say(f"- איבדת: {e['item']}", d.RED)
            elif t == "gold":
                p.gold = max(0, p.gold + e["amount"])
                sign = "+" if e["amount"] > 0 else ""
                d.say(f"{sign}{e['amount']} זהב (יש לך {p.gold})", d.YELLOW)
            elif t == "heal":
                healed = p.heal(e["amount"])
                d.say(f"+ החלמת {healed} חיים ({p.hp}/{p.max_hp})", d.GREEN)
            elif t == "damage":
                amount = e["amount"]
                if isinstance(amount, str):
                    total, rolls = roll(amount)
                    d.say(f"נזק: {fmt(amount, total, rolls)}", d.GRAY)
                    amount = total
                p.hp -= amount
                d.say(f"- נפגעת: {amount} חיים ({max(p.hp, 0)}/{p.max_hp})", d.RED)
            elif t == "stat":
                setattr(p, e["stat"], getattr(p, e["stat"]) + e["amount"])
                sign = "+" if e["amount"] > 0 else ""
                d.say(f"{STAT_NAMES[e['stat']]} {sign}{e['amount']} (עכשיו {getattr(p, e['stat'])})", d.CYAN)
            elif t == "mana":
                p.mana = max(0, min(p.max_mana, p.mana + e["amount"]))
                if p.max_mana:
                    d.say(f"מאנה: {p.mana}/{p.max_mana}", d.MAGENTA)
            elif t == "set_flag":
                if e["flag"] not in p.flags:
                    p.flags.append(e["flag"])
            elif t == "clear_flag":
                if e["flag"] in p.flags:
                    p.flags.remove(e["flag"])
            elif t == "counter":
                name = e["name"]
                old = p.counters.get(name, 0)
                p.counters[name] = e["set"] if "set" in e else old + e.get("amount", 0)
                if not e.get("silent"):
                    diff = p.counters[name] - old
                    sign = "+" if diff > 0 else ""
                    d.say(f"{name}: {sign}{diff} (עכשיו {p.counters[name]})" if diff else
                          f"{name}: {p.counters[name]}", d.CYAN)
            elif t == "message":
                d.say(e["text"], d.CYAN)

    def available(self, choice):
        req = choice.get("requires", {})
        p = self.player
        if "item" in req and not p.has(req["item"]):
            return False
        if "no_item" in req and p.has(req["no_item"]):
            return False
        if "flag" in req and req["flag"] not in p.flags:
            return False
        if "no_flag" in req and req["no_flag"] in p.flags:
            return False
        if "class" in req and p.cls != req["class"]:
            return False
        if "gold" in req and p.gold < req["gold"]:
            return False
        if "mana" in req and p.mana < req["mana"]:
            return False
        if any(not p.has(i) for i in req.get("items", [])):
            return False
        if any(p.has(i) for i in req.get("no_items", [])):
            return False
        if any(f not in p.flags for f in req.get("flags", [])):
            return False
        if "any_flags" in req and not any(f in p.flags for f in req["any_flags"]):
            return False
        if any(f in p.flags for f in req.get("no_flags", [])):
            return False
        if any(p.counters.get(n, 0) < v for n, v in req.get("counter_min", {}).items()):
            return False
        if any(p.counters.get(n, 0) > v for n, v in req.get("counter_max", {}).items()):
            return False
        return True

    # ---------- בחירות ----------
    def choose(self, page):
        self.hops = 0
        choices = [c for c in page.get("choices", []) if self.available(c)]
        shop = page.get("shop")
        while True:
            for i, c in enumerate(choices, 1):
                d.say(f"{i}. {c['text']}", d.BOLD)
            if shop:
                d.say("b. היכנס לחנות", d.BOLD + d.YELLOW)
            d.say(HELP, d.GRAY)
            ans = d.ask("> ").lower()
            if ans.isdigit() and 1 <= int(ans) <= len(choices):
                return self.resolve(choices[int(ans) - 1])
            if ans == "b" and shop:
                self.shop(shop)
            elif ans and not self.command(ans):
                d.say("בחירה לא תקינה.", d.RED)

    def command(self, ans):
        p = self.player
        if ans == "i":
            p.show_inventory()
        elif ans == "s":
            p.show_status()
        elif ans == "p":
            p.drink_potion()
        elif ans == "save":
            p.save(self.save_file)
            d.say("המשחק נשמר.", d.GREEN)
        elif ans in ("h", "?"):
            d.say(HELP)
        elif ans == "q":
            d.say("לשמור לפני היציאה? (y/n)")
            if d.ask("> ").lower().startswith("y"):
                p.save(self.save_file)
                d.say("נשמר.", d.GREEN)
            raise QuitToMenu
        else:
            return False
        return True

    def resolve(self, choice):
        p = self.player
        self.apply_effects(choice.get("effects", []))
        if not p.alive:
            return self.ending("death")
        if "check" in choice:
            c = choice["check"]
            stat = getattr(p, c["stat"])
            total, rolls = roll("d20")
            score = total + stat
            ok = score >= c["dc"]
            d.say(f"בדיקת {STAT_NAMES[c['stat']]}: d20 [{rolls[0]}] + {stat} = {score}, נדרש {c['dc']} - "
                  + ("הצלחה!" if ok else "כישלון!"), d.GREEN if ok else d.RED)
            d.pause()
            return c["success"] if ok else c["fail"]
        if "luck" in choice:
            c = choice["luck"]
            total, rolls = roll("2d6")
            ok = total <= p.luck
            d.say(f"בדוק את מזלך: 2d6 [{'+'.join(map(str, rolls))}] = {total}, מזל {p.luck} - "
                  + ("יש לך מזל!" if ok else "אין לך מזל!"), d.GREEN if ok else d.RED)
            p.luck = max(0, p.luck - 1)
            d.say(f"(המזל שלך יורד ל-{p.luck})", d.GRAY)
            d.pause()
            return c["success"] if ok else c["fail"]
        if "roll" in choice:
            c = choice["roll"]
            total, rolls = roll(c["dice"])
            d.say(f"הטלת קוביות: {fmt(c['dice'], total, rolls)}", d.CYAN)
            d.pause()
            for row in c["table"]:
                if total <= row["max"]:
                    return row["goto"]
            return c["table"][-1]["goto"]
        return choice["goto"]

    def shop(self, items):
        p = self.player
        while True:
            d.rule("-")
            d.say(f"חנות - יש לך {p.gold} זהב", d.BOLD + d.YELLOW)
            for i, it in enumerate(items, 1):
                d.say(f"{i}. {it['item']} - {it['price']} זהב")
            d.say("0. צא מהחנות")
            ans = d.ask("> ")
            if ans == "0":
                d.rule("-")
                return
            if ans.isdigit() and 1 <= int(ans) <= len(items):
                it = items[int(ans) - 1]
                if p.gold < it["price"]:
                    d.say("אין לך מספיק זהב.", d.RED)
                else:
                    p.gold -= it["price"]
                    p.inventory.append(it["item"])
                    d.say(f"קנית: {it['item']}", d.GREEN)

    # ---------- סוף ----------
    def ending(self, kind):
        label, color = ENDINGS.get(kind, ENDINGS["bad"])
        pid = self.player.page
        print()
        d.title(label, color)
        name = self.pages.get(pid, {}).get("ending_title")
        if name:
            d.say(name, d.BOLD + color, center=True)
        self.player.show_status()
        if self.pages.get(pid, {}).get("ending"):
            if record_ending(self.story.get("id", MAIN_STORY), pid):
                found = len(load_found_endings().get(self.story.get("id", MAIN_STORY), []))
                d.say(f"סוף חדש נוסף לספר הסופים! ({found} מתוך {len(story_endings(self.story))})",
                      d.BOLD + d.CYAN)
        if os.path.exists(self.save_file) and kind == "death":
            d.say("(אפשר לטעון את השמירה האחרונה מהתפריט הראשי)", d.GRAY)
        d.pause()
        return None
