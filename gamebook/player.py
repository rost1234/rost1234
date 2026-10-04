"""הדמות של השחקן: תכונות, חיים, מלאי, זהב ודגלים (זיכרון אירועים)."""
import json
import os

import display as d
from dice import roll, fmt

STAT_NAMES = {"strength": "כוח", "agility": "זריזות", "luck": "מזל"}

CLASSES = {
    "warrior": {
        "name": "לוחם",
        "desc": "חזק ועמיד. מתחיל עם חרב ומגן.",
        "bonus": {"strength": 2, "agility": 1, "hp": 6},
        "mana": 0,
        "items": ["חרב", "מגן"],
    },
    "thief": {
        "name": "גנב",
        "desc": "זריז וחמקמק. יודע לפרוץ מנעולים.",
        "bonus": {"strength": 1, "agility": 3, "hp": 2},
        "mana": 0,
        "items": ["פגיון", "ערכת פריצה"],
    },
    "mage": {
        "name": "קוסם",
        "desc": "חלש בגוף אך יודע להטיל לחשים (חץ קסם בקרב).",
        "bonus": {"strength": 0, "agility": 1, "hp": 0},
        "mana": 4,
        "items": ["מטה קסמים", "ספר לחשים"],
    },
}

# בונוס להתקפה לפי כלי נשק (נלקח הנשק הטוב ביותר במלאי)
WEAPONS = {"פגיון": 1, "מטה קסמים": 1, "חרב": 2, "גרזן גמדי": 3, "חרב אלפית": 4}
# הפחתת נזק לפי שריון (מצטבר, עד 2)
ARMOR = {"מגן": 1, "שריון עור": 1, "שריון גמדי": 2}
POTION = "שיקוי ריפוי"


class Player:
    def __init__(self, name="", cls="warrior"):
        self.name = name
        self.cls = cls
        self.strength = 0
        self.agility = 0
        self.luck = 0
        self.hp = 0
        self.max_hp = 0
        self.mana = 0
        self.max_mana = 0
        self.gold = 0
        self.inventory = []
        self.flags = []
        self.page = None

    # ---------- יצירת דמות ----------
    def roll_stats(self):
        b = CLASSES[self.cls]["bonus"]
        lines = []
        for key, expr, extra in (
            ("strength", "1d6+4", b["strength"]),
            ("agility", "1d6+4", b["agility"]),
            ("luck", "1d6+6", 0),
            ("max_hp", "2d6+12", b["hp"]),
        ):
            total, rolls = roll(expr)
            setattr(self, key, total + extra)
            label = STAT_NAMES.get(key, "חיים")
            bonus = f" +{extra} (מקצוע)" if extra else ""
            lines.append(f"{label}: {fmt(expr, total, rolls)}{bonus} => {total + extra}")
        self.hp = self.max_hp
        self.max_mana = self.mana = CLASSES[self.cls]["mana"]
        self.gold = roll("2d6")[0] + 3
        self.inventory = list(CLASSES[self.cls]["items"]) + [POTION, "לפיד"]
        return lines

    @property
    def class_name(self):
        return CLASSES[self.cls]["name"]

    # ---------- מצב ----------
    @property
    def alive(self):
        return self.hp > 0

    def attack_bonus(self):
        return max([WEAPONS[i] for i in self.inventory if i in WEAPONS] or [0])

    def armor(self):
        return min(2, sum(ARMOR[i] for i in set(self.inventory) if i in ARMOR))

    def has(self, item):
        return item in self.inventory

    def heal(self, amount):
        before = self.hp
        self.hp = min(self.max_hp, self.hp + amount)
        return self.hp - before

    def drink_potion(self):
        if not self.has(POTION):
            d.say("אין לך שיקוי ריפוי.", d.RED)
            return False
        self.inventory.remove(POTION)
        total, rolls = roll("1d6+4")
        healed = self.heal(total)
        d.say(f"שתית שיקוי ריפוי: {fmt('1d6+4', total, rolls)}. החלמת {healed} חיים (עכשיו {self.hp}/{self.max_hp}).", d.GREEN)
        return True

    def show_status(self):
        d.rule("-")
        d.say(f"{self.name} | {self.class_name}", d.BOLD + d.CYAN)
        d.say(f"חיים: {self.hp}/{self.max_hp}   כוח: {self.strength}   זריזות: {self.agility}   מזל: {self.luck}")
        extra = f"   מאנה: {self.mana}/{self.max_mana}" if self.max_mana else ""
        d.say(f"זהב: {self.gold}   בונוס נשק: +{self.attack_bonus()}   שריון: {self.armor()}{extra}")
        d.rule("-")

    def show_inventory(self):
        d.rule("-")
        d.say("המלאי שלך:", d.BOLD + d.CYAN)
        if not self.inventory:
            d.say("  (ריק)")
        counts = {}
        for item in self.inventory:
            counts[item] = counts.get(item, 0) + 1
        for item, n in counts.items():
            d.say(f"  - {item}" + (f" x{n}" if n > 1 else ""))
        d.say(f"זהב: {self.gold}", d.YELLOW)
        d.rule("-")

    # ---------- שמירה / טעינה ----------
    def save(self, path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(self.__dict__, f, ensure_ascii=False, indent=2)

    @classmethod
    def load(cls, path):
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        p = cls()
        p.__dict__.update(data)
        return p
