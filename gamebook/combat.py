"""קרבות בסגנון ספרי-משחק: בכל סבב שני הצדדים מטילים 2d6 + כוח, והגבוה פוגע."""
import display as d
from dice import roll, fmt
from player import POTION

PLAYER_DAMAGE = 3
SPELL = "2d6+1"


def fight(player, enemies, can_flee=False):
    """מחזיר 'win', 'flee' או 'dead'."""
    for enemy in enemies:
        result = _duel(player, enemy, can_flee)
        if result != "win":
            return result
    d.say("ניצחת בקרב!", d.BOLD + d.GREEN)
    return "win"


def _duel(player, enemy, can_flee):
    name, skill = enemy["name"], enemy["skill"]
    e_hp = enemy["hp"]
    e_dmg = enemy.get("damage", 2)
    print()
    d.title(f"קרב! {name}  (כוח {skill}, חיים {e_hp})", d.RED)

    while e_hp > 0:
        d.say(f"אתה: {player.hp}/{player.max_hp} חיים   |   {name}: {e_hp} חיים", d.CYAN)
        options = [("attack", "תקוף")]
        if player.has(POTION):
            options.append(("potion", "שתה שיקוי ריפוי"))
        if player.mana > 0:
            options.append(("spell", f"הטל חץ קסם ({SPELL} נזק, מאנה {player.mana})"))
        if can_flee:
            options.append(("flee", "ברח (האויב יפגע בך פעם אחת)"))
        for i, (_, text) in enumerate(options, 1):
            d.say(f"{i}. {text}")
        ans = d.ask("> ")
        if not ans.isdigit() or not 1 <= int(ans) <= len(options):
            continue
        action = options[int(ans) - 1][0]

        if action == "potion":
            player.drink_potion()
            continue
        if action == "flee":
            _hit_player(player, e_dmg, name)
            if player.alive:
                d.say("נמלטת על נפשך!", d.YELLOW)
                return "flee"
            return _died(name)
        if action == "spell":
            player.mana -= 1
            total, rolls = roll(SPELL)
            e_hp -= total
            d.say(f"חץ קסם כחול זורם מכפות ידיך! {fmt(SPELL, total, rolls)} נזק ל{name}.", d.MAGENTA)
            if e_hp > 0:
                # הטלת לחש לוקחת תור - האויב מנסה לפגוע בך בזמן שאתה מרוכז בלחש
                p_total, _ = roll("2d6")
                e_total, _ = roll("2d6")
                if e_total + skill > p_total + player.fighting + player.attack_bonus():
                    _hit_player(player, e_dmg, name)
                    if not player.alive:
                        return _died(name)
                else:
                    d.say(f"{name} מסתער, אבל אתה חומק.", d.GRAY)
            continue

        p_total, p_rolls = roll("2d6")
        e_total, e_rolls = roll("2d6")
        p_score = p_total + player.fighting + player.attack_bonus()
        e_score = e_total + skill
        d.say(f"אתה: 2d6 [{'+'.join(map(str, p_rolls))}] + {player.fighting} + {player.attack_bonus()} = {p_score}"
              f"   |   {name}: 2d6 [{'+'.join(map(str, e_rolls))}] + {skill} = {e_score}", d.GRAY)
        if p_score > e_score:
            e_hp -= PLAYER_DAMAGE
            d.say(f"פגעת ב{name}! (-{PLAYER_DAMAGE})", d.GREEN)
        elif e_score > p_score:
            _hit_player(player, e_dmg, name)
            if not player.alive:
                return _died(name)
        else:
            d.say("הנשקים מתנגשים - אף אחד לא נפגע.")

    d.say(f"{name} נופל מת לרגליך.", d.GREEN)
    return "win"


def _hit_player(player, dmg, name):
    dmg = max(1, dmg - player.armor())
    player.hp -= dmg
    d.say(f"{name} פוגע בך! (-{dmg})", d.RED)


def _died(name):
    d.say(f"נפלת בקרב מול {name}...", d.BOLD + d.RED)
    return "dead"
