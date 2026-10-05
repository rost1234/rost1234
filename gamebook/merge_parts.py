"""ממזג קבצי חלקים לסיפור.

שני מצבים:
  python merge_parts.py [--dry-run]
      ממזג את story/parts/*.json לתוך הסיפור הראשי (story/adventure.json).
  python merge_parts.py <story_id> [--dry-run] [--keep]
      בונה או מעדכן את story/<story_id>.json מכל הקבצים ב-story/parts/<story_id>/
      (למשל 00_meta.json ואחריו 10_act1.json, 20_act2.json...).

כל קובץ חלק נראה כך:
  {"title": ..., "pages": {"200": {...}}, "hooks": [{"page": "18", "choice": {...}}]}
- pages: דפים חדשים (מספר דף שכבר קיים = שגיאה)
- hooks: בחירות שמתווספות לסוף רשימת הבחירות של דף קיים (מוחלות אחרי שכל הדפים נוספו)
- כל מפתח אחר (title, intro, start, weapons, armor, start_effects) נכנס לראש הסיפור
אחרי מיזוג מוצלח קבצי החלקים נמחקים, אלא אם מוסיפים --keep.
"""
import glob
import json
import os
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
STORY_DIR = os.path.join(BASE, "story")
PARTS = os.path.join(STORY_DIR, "parts")


def merge(story, parts):
    """parts: רשימת (שם, תוכן). מחזיר רשימת שגיאות."""
    pages = story.setdefault("pages", {})
    errors = []
    for name, part in parts:
        for key, value in part.items():
            if key in ("pages", "hooks"):
                continue
            if key in story and story[key] != value:
                errors.append(f"{name}: '{key}' כבר מוגדר אחרת בסיפור")
            story[key] = value
        for pid, page in part.get("pages", {}).items():
            if pid in pages:
                errors.append(f"{name}: דף {pid} כבר קיים")
            else:
                pages[pid] = page
    for name, part in parts:
        for hook in part.get("hooks", []):
            pid, choice = hook["page"], hook["choice"]
            if pid not in pages:
                errors.append(f"{name}: hook לדף לא קיים {pid}")
                continue
            choices = pages[pid].setdefault("choices", [])
            if any(c["text"] == choice["text"] for c in choices):
                errors.append(f"{name}: בדף {pid} כבר יש בחירה '{choice['text']}'")
                continue
            choices.append(choice)
    return errors


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if args:
        story_id = args[0]
        story_path = os.path.join(STORY_DIR, f"{story_id}.json")
        parts_dir = os.path.join(PARTS, story_id)
    else:
        story_path = os.path.join(STORY_DIR, "adventure.json")
        parts_dir = PARTS

    story = {}
    if os.path.exists(story_path):
        with open(story_path, encoding="utf-8") as f:
            story = json.load(f)
    files = sorted(glob.glob(os.path.join(parts_dir, "*.json")))
    if not files:
        print(f"אין קבצי חלקים ב-{parts_dir}")
        sys.exit(1)
    parts = []
    for path in files:
        with open(path, encoding="utf-8") as f:
            part = json.load(f)
        parts.append((os.path.basename(path), part))
        print(f"{os.path.basename(path)}: {len(part.get('pages', {}))} דפים, {len(part.get('hooks', []))} hooks")
    errors = merge(story, parts)
    for key in ("title", "start"):
        if key not in story:
            errors.append(f"לסיפור חסר '{key}' (צריך להיות ב-00_meta.json)")
    for e in errors:
        print("שגיאה:", e)
    if errors:
        sys.exit(1)
    if "--dry-run" in sys.argv:
        print(f"בדיקה בלבד: היו {len(story['pages'])} דפים. לא נכתב דבר.")
        return
    # מפתחות הראש קודם, הדפים בסוף - קל יותר לקרוא את הקובץ
    ordered = {k: v for k, v in story.items() if k != "pages"}
    ordered["pages"] = story["pages"]
    with open(story_path, "w", encoding="utf-8") as f:
        json.dump(ordered, f, ensure_ascii=False, indent=2)
        f.write("\n")
    if "--keep" not in sys.argv:
        for path in files:
            os.remove(path)
        if args and not os.listdir(parts_dir):
            os.rmdir(parts_dir)
    print(f"מוזג ל-{os.path.relpath(story_path, BASE)}. סך הכל {len(story['pages'])} דפים.")


if __name__ == "__main__":
    main()
