"""בדיקת איזון ורמאויות: מריץ אלפי משחקים אוטומטיים ומחפש לולאות שאפשר לנצל.

הרצה:  python balance.py [מספר_משחקים] [story/קובץ.json]

מדפיס:
- אחוז ניצחון / מוות / סוף רע לכל מקצוע (בוט שבוחר באקראי אבל לא נכנס ישר לסוף רע, תוקף בקרב ושותה שיקוי כשהחיים נמוכים)
- הדפים שבהם הכי הרבה שחקנים מתים
- לולאות בגרף הדפים שנותנות משאב (זהב, ריפוי, פריט, תכונה) בלי מחיר = רמאות אפשרית
- דפים שהבוט אף פעם לא הגיע אליהם
"""
import collections
import contextlib
import io
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import display as d  # noqa: E402
import engine  # noqa: E402
from player import CLASSES, POTION, Player  # noqa: E402
from validate import targets  # noqa: E402

STORY = os.path.join(d.RESOURCE_DIR, "story", "adventure.json")
GAIN_EFFECTS = {"gold", "heal", "add_item", "stat", "mana"}
MAX_STEPS = 400


class Bot:
    """מקבל את כל הקלטים של המשחק ומחליט כמו שחקן סביר-אקראי."""

    def __init__(self, player):
        self.p = player
        self.steps = 0

    def __call__(self, prompt="> "):
        self.steps += 1
        if self.steps > MAX_STEPS:
            raise TimeoutError
        p = self.p
        if p.hp <= p.max_hp // 3 and p.has(POTION):
            return "p" if self.in_page else "2"
        return random.choice(["1", "1", "2", "2", "3", "4", "5", "6", "7", "8", "9"])


def play_one(story, cls):
    p = Player("bot", cls)
    p.roll_stats()
    g = engine.Game(story, p)
    bot = Bot(p)
    bot.in_page = True
    d.ask = bot
    result = {"end": "stuck", "deaths_at": None, "pages": []}

    def ending(kind):
        result["end"] = kind
        if kind == "death":
            result["deaths_at"] = p.page
        return None

    orig_choose = g.choose

    def choose(page):
        bot.in_page = True
        if p.hp <= p.max_hp // 3 and p.has(POTION):
            p.drink_potion()
        # שחקן סביר: לא בוחר בחירה שמובילה ישר לסוף רע (פיתוי ברור / יציאה מהמשימה)
        options = [c for c in page.get("choices", []) if g.available(c)]
        safe = [c for c in options
                if g.pages.get(c.get("goto"), {}).get("ending") not in ("bad", "alt")]
        if safe:
            return g.resolve(random.choice(safe))
        return orig_choose(page)

    orig_play = g.play_page

    def play(pid, fresh=True):
        result["pages"].append(pid)
        bot.in_page = "combat" not in g.pages[pid]
        return orig_play(pid, fresh)

    g.ending, g.choose, g.play_page = ending, choose, play
    g.shop = lambda items: None  # הבוט לא קונה
    try:
        g.run()
    except TimeoutError:
        result["end"] = "stuck"
    result["gold"] = p.gold
    return result


def free_loops(story):
    """מחפש מעגלים בגרף שיש בהם רווח בלי מחיר (בלי בדיקה, קרב או תשלום)."""
    pages = story["pages"]
    issues = []
    graph = {pid: set(targets(pg)) for pid, pg in pages.items()}

    def gains(pid):
        pg = pages[pid]
        effs = list(pg.get("effects", []))
        for ch in pg.get("choices", []):
            effs += ch.get("effects", [])
        good = [e for e in effs if e["type"] in GAIN_EFFECTS and e.get("amount", 1) > 0]
        return good

    # רכיבים קשירים חזק (Tarjan) - כל רכיב עם יותר מדף אחד הוא מעגל
    index, low, stack, on, sccs, i = {}, {}, [], set(), [], [0]

    def strong(v):
        index[v] = low[v] = i[0]
        i[0] += 1
        stack.append(v)
        on.add(v)
        for w in graph[v]:
            if w not in index:
                strong(w)
                low[v] = min(low[v], low[w])
            elif w in on:
                low[v] = min(low[v], index[w])
        if low[v] == index[v]:
            comp = []
            while True:
                w = stack.pop()
                on.discard(w)
                comp.append(w)
                if w == v:
                    break
            sccs.append(comp)

    sys.setrecursionlimit(10000)
    for v in graph:
        if v not in index:
            strong(v)
    for comp in sccs:
        if len(comp) < 2 and comp[0] not in graph[comp[0]]:
            continue
        loot = {pid: gains(pid) for pid in comp if gains(pid)}
        if loot:
            issues.append((sorted(comp, key=lambda x: (len(x), x)), loot))
    return issues


def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 2000
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass
    d.settings.update(rtl=False, color=False)
    story = engine.load_story(sys.argv[2] if len(sys.argv) > 2 else STORY)
    seen = set()
    deaths = collections.Counter()
    print(f"=== {n} משחקים לכל מקצוע ===")
    for cls in CLASSES:
        ends = collections.Counter()
        for _ in range(n):
            with contextlib.redirect_stdout(io.StringIO()):
                r = play_one(story, cls)
            ends[r["end"]] += 1
            seen.update(r["pages"])
            if r["deaths_at"]:
                deaths[r["deaths_at"]] += 1
        pct = {k: f"{100 * v / n:.0f}%" for k, v in ends.most_common()}
        print(f"{CLASSES[cls]['name']:6} {pct}")

    print("\n=== דפים עם הכי הרבה מיתות ===")
    for pid, c in deaths.most_common(8):
        print(f"דף {pid}: {c}")

    print("\n=== לולאות עם רווח בלי מחיר (רמאות אפשרית) ===")
    loops = free_loops(story)
    if not loops:
        print("לא נמצאו")
    for comp, loot in loops:
        print(f"מעגל {comp}: רווחים ב-{ {k: [e['type'] for e in v] for k, v in loot.items()} }")

    never = sorted(set(story["pages"]) - seen, key=lambda x: (len(x), x))
    print("\n=== דפים שהבוט לא הגיע אליהם ===")
    print(never or "אין")


if __name__ == "__main__":
    main()
