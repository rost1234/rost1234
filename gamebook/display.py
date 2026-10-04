"""הדפסה לטרמינל: עטיפת שורות, צבעים, ותמיכה בעברית ב-CMD.

ה-CMD של Windows לא יודע לכתוב מימין לשמאל, ולכן עברית יוצאת הפוכה.
במצב rtl=True אנחנו הופכים כל שורה בעצמנו (אחרי עטיפת השורות) ומיישרים לימין.
מספרים ואנגלית (כמו 2d6 או 12) נשארים בסדר הנכון.
"""
import json
import os
import re
import shutil
import sys
import textwrap

try:  # אם מותקן python-bidi נשתמש בו, אחרת במימוש הפנימי
    from bidi.algorithm import get_display as _bidi_get_display
except ImportError:
    _bidi_get_display = None

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SETTINGS_FILE = os.path.join(BASE_DIR, "settings.json")

settings = {"rtl": None, "color": True}

RESET = "\033[0m"
BOLD = "\033[1m"
RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
MAGENTA = "\033[95m"
CYAN = "\033[96m"
GRAY = "\033[90m"

_LTR_RUN = re.compile(r"[A-Za-z0-9](?:[A-Za-z0-9.:/%+\-]*[A-Za-z0-9])?")
_MIRROR = str.maketrans("()[]{}<>", ")(][}{><")


def setup_console():
    """מכין את הטרמינל: UTF-8 וצבעי ANSI (גם ב-Windows)."""
    if os.name == "nt":
        os.system("chcp 65001 >nul")
        os.system("")  # מפעיל תמיכה בקודי ANSI ב-CMD
    for stream in (sys.stdout, sys.stdin):
        try:
            stream.reconfigure(encoding="utf-8")
        except (AttributeError, ValueError):
            pass
    if os.environ.get("NO_COLOR"):
        settings["color"] = False


def load_settings():
    try:
        with open(SETTINGS_FILE, encoding="utf-8") as f:
            settings.update(json.load(f))
    except (OSError, ValueError):
        pass


def save_settings():
    try:
        with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
            json.dump(settings, f, ensure_ascii=False, indent=2)
    except OSError:
        pass


def width():
    return max(30, min(shutil.get_terminal_size((80, 24)).columns - 1, 78))


def visual(line):
    """הופך שורה לוגית לסדר תצוגה מימין לשמאל."""
    if _bidi_get_display:
        return _bidi_get_display(line)
    # הופכים כל רצף אנגלית/מספרים מראש, כך שאחרי היפוך כל השורה הוא יחזור לסדר הנכון
    s = _LTR_RUN.sub(lambda m: m.group(0)[::-1], line)
    return s[::-1].translate(_MIRROR)


def _out(line, color=None, center=False):
    w = width()
    if settings.get("rtl"):
        line = visual(line)
        pad = (w - len(line)) // 2 if center else w - len(line)
        line = " " * max(0, pad) + line
    elif center:
        line = line.center(w).rstrip()
    if color and settings.get("color"):
        line = color + line + RESET
    print(line)


def say(text="", color=None, center=False):
    """מדפיס טקסט (אפשר כמה פסקאות עם \\n) עם עטיפת שורות."""
    w = width()
    for para in str(text).split("\n"):
        lines = textwrap.wrap(para, w) or [""]
        for ln in lines:
            _out(ln, color, center)


def rule(char="="):
    line = char * width()
    print(GRAY + line + RESET if settings.get("color") else line)


def title(text, color=YELLOW):
    rule()
    say(text, (BOLD + color), center=True)
    rule()


def ask(prompt="> "):
    try:
        return input(prompt).strip()
    except EOFError:
        print()
        raise SystemExit(0)


def pause():
    say("[Enter] להמשך...", GRAY)
    ask("")


def calibrate():
    """מסך כיול: המשתמש בוחר איזו שורה נקראת נכון בטרמינל שלו."""
    sample = "שלום הרפתקן! ברוך הבא לדף 12."
    print()
    print("Which line reads correctly in Hebrew (right-to-left)?")
    print("איזו שורה נקראת נכון? (1 או 2)")
    print()
    print("  1)   " + sample)
    print("  2)   " + visual(sample))
    print()
    while True:
        ans = ask("1/2 > ")
        if ans in ("1", "2"):
            settings["rtl"] = ans == "2"
            save_settings()
            return
