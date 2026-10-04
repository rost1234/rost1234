"""ממזג קבצי חלקים (story/parts/*.json) לתוך הסיפור הראשי.

כל קובץ חלק נראה כך:
  {"pages": {"200": {...}}, "hooks": [{"page": "18", "choice": {...}}]}
- pages: דפים חדשים (מספר דף שכבר קיים = שגיאה)
- hooks: בחירות שמתווספות לסוף רשימת הבחירות של דף קיים

הרצה:  python merge_parts.py [--dry-run]
"""
import glob
import json
import os
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
STORY = os.path.join(BASE, "story", "adventure.json")
PARTS = os.path.join(BASE, "story", "parts")


def merge(story, part, name):
    pages = story["pages"]
    errors = []
    for pid, page in part.get("pages", {}).items():
        if pid in pages:
            errors.append(f"{name}: דף {pid} כבר קיים")
        else:
            pages[pid] = page
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
    with open(STORY, encoding="utf-8") as f:
        story = json.load(f)
    files = sorted(glob.glob(os.path.join(PARTS, "*.json")))
    errors = []
    for path in files:
        with open(path, encoding="utf-8") as f:
            part = json.load(f)
        name = os.path.basename(path)
        errors += merge(story, part, name)
        print(f"{name}: {len(part.get('pages', {}))} דפים, {len(part.get('hooks', []))} hooks")
    for e in errors:
        print("שגיאה:", e)
    if errors:
        sys.exit(1)
    if "--dry-run" not in sys.argv:
        with open(STORY, "w", encoding="utf-8") as f:
            json.dump(story, f, ensure_ascii=False, indent=2)
            f.write("\n")
        for path in files:
            os.remove(path)
        print(f"מוזג. סך הכל {len(story['pages'])} דפים.")


if __name__ == "__main__":
    main()
