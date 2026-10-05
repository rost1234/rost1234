"""בדיקת תקינות לקובץ סיפור.

בודק: קישורים שבורים, דפים שאי אפשר להגיע אליהם, מבויים סתומים, מפתחות לא מוכרים (שגיאות כתיב),
פריטים שנדרשים אבל אף אחד לא נותן, דגלים שנבדקים אבל אף אחד לא מדליק, ומונים שנבדקים אבל לא משתנים.

הרצה:  python validate.py [story/adventure.json]
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dice import _DICE_RE  # noqa: E402
from player import CLASSES, POTION  # noqa: E402

STATS = {"strength", "agility", "luck"}
ENDING_KINDS = {"true", "win", "alt", "bad", "death"}
EFFECT_FIELDS = {
    "add_item": ["item"], "remove_item": ["item"], "gold": ["amount"], "heal": ["amount"],
    "damage": ["amount"], "stat": ["stat", "amount"], "mana": ["amount"], "set_flag": ["flag"],
    "clear_flag": ["flag"], "counter": ["name"], "message": ["text"],
}
REQUIRE_KEYS = {"item", "no_item", "items", "no_items", "flag", "no_flag", "flags", "any_flags",
                "no_flags", "class", "gold", "mana", "counter_min", "counter_max"}
RESOLVERS = ("goto", "check", "luck", "roll")
PAGE_KEYS = {"text", "effects", "combat", "shop", "choices", "ending", "ending_title", "redirect"}
CHOICE_KEYS = {"text", "requires", "effects", *RESOLVERS}
BASE_ITEMS = {POTION, "לפיד"} | {i for c in CLASSES.values() for i in c["items"]}


def targets(page):
    """כל הדפים שאפשר להגיע אליהם מדף מסוים."""
    out = []
    c = page.get("combat")
    if isinstance(c, dict):
        out += [c.get("win"), c.get("flee")]
    for ch in page.get("choices", []):
        out.append(ch.get("goto"))
        for key in ("check", "luck"):
            if isinstance(ch.get(key), dict):
                out += [ch[key].get("success"), ch[key].get("fail")]
        if isinstance(ch.get("roll"), dict):
            out += [row.get("goto") for row in ch["roll"].get("table", [])]
    for r in page.get("redirect", []):
        out.append(r.get("goto"))
    return [t for t in out if t is not None]


def _lint_effects(where, effects, errors):
    for e in effects or []:
        t = e.get("type")
        if t not in EFFECT_FIELDS:
            errors.append(f"{where}: אפקט לא מוכר '{t}'")
            continue
        for field in EFFECT_FIELDS[t]:
            if field not in e:
                errors.append(f"{where}: לאפקט {t} חסר '{field}'")
        if t == "stat" and e.get("stat") not in STATS:
            errors.append(f"{where}: תכונה לא מוכרת '{e.get('stat')}'")
        if t == "counter" and "amount" not in e and "set" not in e:
            errors.append(f"{where}: לאפקט counter חסר 'amount' או 'set'")
        if t == "damage" and isinstance(e.get("amount"), str) and not _DICE_RE.match(e["amount"]):
            errors.append(f"{where}: ביטוי קוביות לא תקין '{e['amount']}'")


def _lint_requires(where, req, errors):
    for key in req:
        if key not in REQUIRE_KEYS:
            errors.append(f"{where}: תנאי לא מוכר '{key}'")
    if "class" in req and req["class"] not in CLASSES:
        errors.append(f"{where}: מקצוע לא מוכר '{req['class']}'")
    for key in ("items", "no_items", "flags", "any_flags", "no_flags"):
        if key in req and not isinstance(req[key], list):
            errors.append(f"{where}: '{key}' חייב להיות רשימה")
    for key in ("counter_min", "counter_max"):
        if key in req and not isinstance(req[key], dict):
            errors.append(f"{where}: '{key}' חייב להיות {{\"שם\": מספר}}")


def lint_page(pid, page):
    """בדיקות מבנה לדף בודד. מחזיר (שגיאות, אזהרות)."""
    errors, warnings = [], []
    where = f"דף {pid}"
    for key in page:
        if key not in PAGE_KEYS:
            errors.append(f"{where}: מפתח לא מוכר '{key}'")
    if not page.get("text") and "redirect" not in page:
        errors.append(f"{where}: אין טקסט")
    if not targets(page) and not page.get("ending"):
        errors.append(f"{where}: אין בחירות, קרב, ניתוב או סוף (מבוי סתום)")
    if page.get("ending"):
        if page["ending"] not in ENDING_KINDS:
            errors.append(f"{where}: סוג סוף לא מוכר '{page['ending']}'")
        if page.get("choices") or page.get("combat") or page.get("redirect"):
            warnings.append(f"{where}: דף סוף עם בחירות/קרב/ניתוב - הם לא יוצגו")
    _lint_effects(where, page.get("effects"), errors)

    c = page.get("combat")
    if c is not None:
        enemies = c.get("enemies", [c])
        for en in enemies:
            for field in ("name", "skill", "hp"):
                if field not in en:
                    errors.append(f"{where}: לאויב בקרב חסר '{field}'")
        if "win" not in c:
            errors.append(f"{where}: לקרב חסר 'win'")

    for i, ch in enumerate(page.get("choices", []), 1):
        cw = f"{where} בחירה {i}"
        if not ch.get("text"):
            errors.append(f"{cw}: אין טקסט")
        for key in ch:
            if key not in CHOICE_KEYS:
                errors.append(f"{cw}: מפתח לא מוכר '{key}'")
        n = sum(1 for r in RESOLVERS if r in ch)
        if n != 1:
            errors.append(f"{cw}: צריכה בדיוק אחד מ-goto/check/luck/roll (יש {n})")
        if "check" in ch:
            chk = ch["check"]
            if chk.get("stat") not in STATS:
                errors.append(f"{cw}: תכונה לא מוכרת '{chk.get('stat')}'")
            if not isinstance(chk.get("dc"), int):
                errors.append(f"{cw}: dc חייב להיות מספר")
            for k in ("success", "fail"):
                if k not in chk:
                    errors.append(f"{cw}: לבדיקה חסר '{k}'")
        if "luck" in ch:
            for k in ("success", "fail"):
                if k not in ch["luck"]:
                    errors.append(f"{cw}: לבדיקת מזל חסר '{k}'")
        if "roll" in ch:
            r = ch["roll"]
            if not _DICE_RE.match(str(r.get("dice", ""))):
                errors.append(f"{cw}: ביטוי קוביות לא תקין '{r.get('dice')}'")
            table = r.get("table", [])
            if not table or any("max" not in row or "goto" not in row for row in table):
                errors.append(f"{cw}: טבלת roll צריכה שורות עם max ו-goto")
            elif [row["max"] for row in table] != sorted(row["max"] for row in table):
                errors.append(f"{cw}: שורות טבלת roll חייבות להיות מסודרות לפי max עולה")
        _lint_requires(cw, ch.get("requires", {}), errors)
        _lint_effects(cw, ch.get("effects"), errors)

    redirect = page.get("redirect")
    if redirect is not None:
        if not redirect:
            errors.append(f"{where}: redirect ריק")
        elif redirect[-1].get("requires"):
            errors.append(f"{where}: השורה האחרונה ב-redirect צריכה להיות בלי תנאי (ברירת מחדל)")
        for r in redirect or []:
            if "goto" not in r:
                errors.append(f"{where}: שורת redirect בלי goto")
            _lint_requires(where, r.get("requires", {}), errors)

    for it in page.get("shop", []):
        if "item" not in it or "price" not in it:
            errors.append(f"{where}: פריט בחנות צריך item ו-price")
    return errors, warnings


def collect(pages, start_effects=()):
    """מה הסיפור נותן ומה הוא דורש: פריטים, דגלים ומונים, עם מיקום."""
    given_items, set_flags, changed_counters = set(BASE_ITEMS), set(), set()
    need_items, need_flags, need_counters, checked_flags = {}, {}, {}, set()

    def effects(effs):
        for e in effs or []:
            if e.get("type") == "add_item":
                given_items.add(e.get("item"))
            elif e.get("type") == "set_flag":
                set_flags.add(e.get("flag"))
            elif e.get("type") == "counter":
                changed_counters.add(e.get("name"))

    def requires(where, req):
        for i in [req.get("item")] + list(req.get("items", [])):
            if i:
                need_items.setdefault(i, where)
        for f in [req.get("flag")] + list(req.get("flags", [])) + list(req.get("any_flags", [])):
            if f:
                need_flags.setdefault(f, where)
        for f in [req.get("flag"), req.get("no_flag")] + list(req.get("flags", [])) + \
                list(req.get("any_flags", [])) + list(req.get("no_flags", [])):
            if f:
                checked_flags.add(f)
        for key in ("counter_min", "counter_max"):
            for n in (req.get(key) or {}):
                need_counters.setdefault(n, where)

    effects(start_effects)
    for pid, page in pages.items():
        effects(page.get("effects"))
        for it in page.get("shop", []):
            given_items.add(it.get("item"))
        for ch in page.get("choices", []):
            effects(ch.get("effects"))
            requires(f"דף {pid}", ch.get("requires", {}))
        for r in page.get("redirect", []):
            requires(f"דף {pid}", r.get("requires", {}))
    return {
        "given_items": given_items, "set_flags": set_flags, "changed_counters": changed_counters,
        "need_items": need_items, "need_flags": need_flags, "need_counters": need_counters,
        "checked_flags": checked_flags,
    }


def validate(path):
    with open(path, encoding="utf-8") as f:
        story = json.load(f)
    pages = story["pages"]
    errors, warnings = [], []

    if story.get("start") not in pages:
        errors.append(f"דף ההתחלה '{story.get('start')}' לא קיים")
    _lint_effects("start_effects", story.get("start_effects"), errors)
    for pid, page in pages.items():
        e, w = lint_page(pid, page)
        errors += e
        warnings += w
        for t in targets(page):
            if t not in pages:
                errors.append(f"דף {pid}: מפנה לדף לא קיים {t}")

    info = collect(pages, story.get("start_effects"))
    for item, where in info["need_items"].items():
        if item not in info["given_items"]:
            errors.append(f"{where}: דורש פריט '{item}' שאף דף לא נותן")
    for flag, where in info["need_flags"].items():
        if flag not in info["set_flags"]:
            errors.append(f"{where}: דורש דגל '{flag}' שאף דף לא מדליק")
    for name, where in info["need_counters"].items():
        if name not in info["changed_counters"]:
            errors.append(f"{where}: בודק מונה '{name}' שאף דף לא משנה")
    unused = sorted(info["set_flags"] - info["checked_flags"])
    if unused:
        warnings.append(f"דגלים שנדלקים אבל אף פעם לא נבדקים: {', '.join(unused)}")

    # לולאה של דפי ניתוב בלבד = המשחק יסתובב לנצח בלי לשאול את השחקן
    relay = {pid for pid, pg in pages.items()
             if "redirect" in pg and not pg.get("choices") and not pg.get("combat")}
    state = {}

    def visit(pid, path):
        state[pid] = 1
        for t in {r.get("goto") for r in pages[pid].get("redirect", [])}:
            if t in relay:
                if state.get(t) == 1:
                    errors.append(f"לולאת ניתוב אינסופית: {' -> '.join(path + [t])}")
                elif t not in state:
                    visit(t, path + [t])
        state[pid] = 2

    for pid in relay:
        if pid not in state:
            visit(pid, [pid])

    seen, stack = set(), [story.get("start")]
    while stack:
        pid = stack.pop()
        if pid in seen or pid not in pages:
            continue
        seen.add(pid)
        stack += targets(pages[pid])
    for pid in pages:
        if pid not in seen:
            errors.append(f"דף {pid}: אי אפשר להגיע אליו")
    endings = {}
    for pid in seen:
        kind = pages[pid].get("ending")
        if kind:
            endings[kind] = endings.get(kind, 0) + 1
    if not set(endings) & {"win", "true"}:
        errors.append("אין סוף ניצחון שאפשר להגיע אליו")

    summary = ", ".join(f"{k}: {v}" for k, v in sorted(endings.items()))
    print(f"{len(pages)} דפים, {len(seen)} נגישים, סופים: {sorted(endings)} ({summary})")
    for w in warnings:
        print("אזהרה:", w)
    for e in errors:
        print("שגיאה:", e)
    print("תקין!" if not errors else f"{len(errors)} שגיאות")
    return not errors


if __name__ == "__main__":
    try:  # ב-Windows הפלט עלול להיות cp1252, שלא יודע להדפיס עברית
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass
    default = os.path.join(os.path.dirname(os.path.abspath(__file__)), "story", "adventure.json")
    sys.exit(0 if validate(sys.argv[1] if len(sys.argv) > 1 else default) else 1)
