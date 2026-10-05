"""בדיקה של מערכה אחת בסיפור שכותבים כמה סוכנים במקביל, מול חוזה המערכות של הסיפור.

הרצה:  python check_part.py <story_id> <קובץ_מערכה>
דוגמה: python check_part.py thieves 20_act2.json

קורא את bibles/<story_id>.contract.json ואת story/parts/<story_id>/<קובץ_מערכה>, ובודק:
- כל הדפים בטווח המספרים של המערכה, וכמות הדפים בטווח שנקבע
- דפי הכניסה של המערכה קיימים, וכל דף נגיש מהם
- כל קישור מוביל לדף בתוך המערכה או לאחת מהיציאות שבחוזה
- אותן בדיקות מבנה כמו validate.py (מפתחות לא מוכרים, מבויים סתומים, קוביות, ניתוב...)
- דגלים, פריטים ומונים שהמערכה דורשת: נוצרים בתוכה או מופיעים בחוזה
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from validate import collect, lint_page, targets  # noqa: E402

BASE = os.path.dirname(os.path.abspath(__file__))


def check(story_id, act_file):
    with open(os.path.join(BASE, "bibles", f"{story_id}.contract.json"), encoding="utf-8") as f:
        contract = json.load(f)
    act = next((a for a in contract["acts"] if a["file"] == act_file), None)
    if act is None:
        print(f"שגיאה: אין מערכה '{act_file}' בחוזה. קיימות: {[a['file'] for a in contract['acts']]}")
        return False
    with open(os.path.join(BASE, "story", "parts", story_id, act_file), encoding="utf-8") as f:
        part = json.load(f)
    pages = part.get("pages", {})
    errors, warnings = [], []
    lo, hi = act["range"]
    exits = set(act.get("exits", []))
    act_no = contract["acts"].index(act) + 1

    for key in part:
        if key not in ("pages",):
            errors.append(f"מפתח לא צפוי בקובץ מערכה: '{key}' (רק \"pages\")")
    for pid, page in pages.items():
        if not pid.isdigit() or not lo <= int(pid) <= hi:
            errors.append(f"דף {pid}: מחוץ לטווח של המערכה ({lo}-{hi})")
        e, w = lint_page(pid, page)
        errors += e
        warnings += w
        for t in targets(page):
            if t not in pages and t not in exits:
                errors.append(f"דף {pid}: מפנה ל-{t}, שלא נמצא במערכה ולא ביציאות שלה {sorted(exits)}")

    lo_n, hi_n = act.get("pages", [0, 10 ** 6])
    if not lo_n <= len(pages) <= hi_n:
        errors.append(f"במערכה {len(pages)} דפים, החוזה דורש {lo_n}-{hi_n}")

    for entry in act.get("entries", []):
        if entry not in pages:
            errors.append(f"דף הכניסה {entry} לא קיים")
    seen, stack = set(), [e for e in act.get("entries", []) if e in pages]
    used_exits = set()
    while stack:
        pid = stack.pop()
        if pid in seen:
            continue
        if pid not in pages:
            used_exits.add(pid)
            continue
        seen.add(pid)
        stack += targets(pages[pid])
    for pid in pages:
        if pid not in seen:
            errors.append(f"דף {pid}: אי אפשר להגיע אליו מדפי הכניסה של המערכה")
    for ex in sorted(exits - used_exits):
        warnings.append(f"היציאה {ex} מהחוזה לא בשימוש באף דף")

    info = collect(pages)
    known_flags = set(contract.get("flags", {})) | info["set_flags"]
    known_items = set(contract.get("items", {})) | info["given_items"]
    known_counters = set(contract.get("counters", {})) | info["changed_counters"]
    for item, where in info["need_items"].items():
        if item not in known_items:
            errors.append(f"{where}: פריט '{item}' לא ניתן במערכה ולא מופיע בחוזה")
    for flag, where in info["need_flags"].items():
        if flag not in known_flags:
            errors.append(f"{where}: דגל '{flag}' לא נדלק במערכה ולא מופיע בחוזה")
    for name, where in info["need_counters"].items():
        if name not in known_counters:
            errors.append(f"{where}: מונה '{name}' לא משתנה במערכה ולא מופיע בחוזה")
    local = f"a{act_no}_"
    for flag in sorted(info["set_flags"]):
        if flag not in contract.get("flags", {}) and not flag.startswith(local):
            warnings.append(f"דגל '{flag}' לא בחוזה. אם הוא מקומי למערכה, קרא לו {local}{flag}")

    endings = {}
    for page in pages.values():
        if page.get("ending"):
            endings[page["ending"]] = endings.get(page["ending"], 0) + 1
    print(f"{act['name']}: {len(pages)} דפים (נדרש {lo_n}-{hi_n}), סופים: {endings or 'אין'}")
    for w in warnings:
        print("אזהרה:", w)
    for e in errors:
        print("שגיאה:", e)
    print("תקין!" if not errors else f"{len(errors)} שגיאות")
    return not errors


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(2)
    sys.exit(0 if check(sys.argv[1], sys.argv[2]) else 1)
