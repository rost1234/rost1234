"""הטלת קוביות בסגנון DnD: roll("2d6"), roll("d20+3"), roll("1d6-1")."""
import random
import re

_DICE_RE = re.compile(r"^\s*(\d*)d(\d+)\s*([+-]\s*\d+)?\s*$", re.IGNORECASE)


def roll(expr):
    """מחזיר (סכום, רשימת_הטלות). לדוגמה roll("2d6+1") -> (9, [3, 5])."""
    m = _DICE_RE.match(expr)
    if not m:
        raise ValueError(f"ביטוי קוביות לא תקין: {expr}")
    count = int(m.group(1) or 1)
    sides = int(m.group(2))
    mod = int(m.group(3).replace(" ", "")) if m.group(3) else 0
    rolls = [random.randint(1, sides) for _ in range(count)]
    return sum(rolls) + mod, rolls


def fmt(expr, total, rolls):
    """טקסט קצר להצגת הטלה: 2d6 [3+5] = 8"""
    return f"{expr} [{'+'.join(str(r) for r in rolls)}] = {total}"
