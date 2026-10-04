"""בדיקת תקינות לקובץ הסיפור: קישורים שבורים, דפים שאי אפשר להגיע אליהם, וסופים.

הרצה:  python validate.py [story/adventure.json]
"""
import json
import os
import sys

STATS = {"strength", "agility", "luck"}


def targets(page):
    out = []
    c = page.get("combat")
    if c:
        out += [c["win"]] + ([c["flee"]] if "flee" in c else [])
    for ch in page.get("choices", []):
        if "goto" in ch:
            out.append(ch["goto"])
        for key in ("check", "luck"):
            if key in ch:
                out += [ch[key]["success"], ch[key]["fail"]]
    return out


def validate(path):
    with open(path, encoding="utf-8") as f:
        story = json.load(f)
    pages = story["pages"]
    errors = []

    for pid, page in pages.items():
        if "text" not in page:
            errors.append(f"דף {pid}: אין טקסט")
        nexts = targets(page)
        if not nexts and not page.get("ending"):
            errors.append(f"דף {pid}: אין בחירות, קרב או סוף (מבוי סתום)")
        for t in nexts:
            if t not in pages:
                errors.append(f"דף {pid}: מפנה לדף לא קיים {t}")
        for ch in page.get("choices", []):
            if "check" in ch and ch["check"]["stat"] not in STATS:
                errors.append(f"דף {pid}: תכונה לא מוכרת {ch['check']['stat']}")

    seen, stack = set(), [story["start"]]
    while stack:
        pid = stack.pop()
        if pid in seen or pid not in pages:
            continue
        seen.add(pid)
        stack += targets(pages[pid])

    for pid in pages:
        if pid not in seen:
            errors.append(f"דף {pid}: אי אפשר להגיע אליו")
    endings = {pages[p]["ending"] for p in seen if pages[p].get("ending")}
    if "win" not in endings:
        errors.append("אין סוף ניצחון שאפשר להגיע אליו")

    print(f"{len(pages)} דפים, {len(seen)} נגישים, סופים: {sorted(endings)}")
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
