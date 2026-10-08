# הרכבת נגן השכבות לפרויקט של גיא

הקובץ `layered-music.patch` מוסיף לשולחן האונליין של [GuySten/Claude-Code-Game-Master](https://github.com/GuySten/Claude-Code-Game-Master) סוג מוזיקה חדש: **סט בשכבות**.

השלבים של הסט מתנגנים בלופ, וה‑DM מחליף שלב, עוצמה או סיום בפקודה. כל השחקנים עוברים יחד, באותה פעמה.

- **בסיס:** ה‑patch נכתב מול commit `794cb18` של הפרויקט.
- **בדיקה:** כל 85 הבדיקות של `tests/test_table_server.py` עוברות. 84 מהן היו קיימות, ואחת חדשה בודקת את הפיצ'ר.
- **בדיקת דפדפן:** הוא נבדק גם בדפדפן אמיתי: שחקן הצטרף לשולחן, וה‑DM החליף עוצמה, עבר לשלב 2 דרך מעבר וסיים.

## התקנה

מתוך תיקיית הפרויקט של גיא:

```bash
git apply /path/to/rost1234/integration/ccgm/layered-music.patch
```

**רישיון:** הפרויקט של גיא ברישיון CC BY-NC-SA 4.0. אחרי ההרכבה, הקוד המשולב נמצא תחת אותו רישיון.

## הכנת סט

1. מרנדרים את השלבים כשכבות, לפי ה‑skill `boss-music`, בפרק "לופים ושכבות".
2. מעתיקים את הסט לתיקיית המוזיקה של הקמפיין, בצורה שהשרת מגיש: שמות קבצים שטוחים עם תחילית, וקובץ `<set>.layers.json` לצידם.

```bash
python3 player/export_ccgm.py music/clockwork-abbot/layers/manifest.json \
    <ccgm>/world-state/campaigns/<campaign>/music --name horologe
```

## פקודות ל‑DM

```bash
bash tools/gm-table.sh music layers horologe --intensity calm      # מתחיל את שלב 1, רגוע
bash tools/gm-table.sh music layers horologe --intensity full      # מעלה עוצמה: השכבות נכנסות בהדרגה
bash tools/gm-table.sh music layers horologe stage 2 --via rise    # עובר לשלב 2 בתיבה הבאה, דרך המעבר
bash tools/gm-table.sh music layers horologe --cue ending          # סיום בתיבה הבאה; הלופ נעצר
bash tools/gm-table.sh music layers horologe stage 1               # אחרי סיום: מתחיל מחדש
```

אותו דבר דרך ה‑API: שולחים `POST /api/gm/music` עם הגוף `{"layers": "horologe", "stage": 2, "via": "rise", "intensity": "full", "cue": "ending"}`. כל השדות חוץ מ‑`layers` אופציונליים.

## איך זה עובד

**השרת** (`lib/table_server.py`):
- `set_layers()` שומר במצב המוזיקה את הסט כולו, את השלב, את העוצמה ואת זמן ההתחלה.
- **מעבר שלב או סיום** נקבע על קו התיבה הבא של השלב שמתנגן, לפחות 4.5 שניות קדימה. הדף שואל את השרת על המצב כל 4 שניות, כך שכל שחקן שומע על השינוי לפני שהוא קורה.
- **שינוי עוצמה** לא מחליף את ה‑id של המוזיקה, ולכן הדף לא מתחיל מחדש. הוא רק מעמעם או מגביר שכבות.
- **אחרי סיום** (`--cue`), כל פקודה בלי `--cue` מתחילה את הסט מחדש.

**הדף** (`lib/table_page.html`):
- הפונקציה `layeredTrack()` מנגנת את הסט עם `lib/layered_player.js`, שהוא אותו מנוע שנמצא ב‑`player/` אצלנו.
- **שחקן שמצטרף באמצע** שומע את אותו מקום בלופ כמו כולם.
- **עדכון שמגיע באיחור**, אחרי שקו התיבה כבר עבר, עובר בקו התיבה הבא, כך שהמעבר נשאר על הפעמה.

**המנוע:** `lib/layered_player.js` הוא עותק של `player/layered-player.js`. אם משנים את המנוע אצלנו, צריך להעתיק אותו שוב וליצור את ה‑patch מחדש.
