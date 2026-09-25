# חיבור ה-AI (Supabase + Gemini)

האפליקציה עובדת בלי AI: המסלולים המובנים, הכרטיסיות, החזרה והגיבוי שומרים הכול במכשיר.
ה-AI נדרש לשלוש תכונות:
- **משוב סוקרטי** על ההסבר שלכם
- **יצירת כרטיסיות** מטקסט או מ-PDF
- **בניית מפת לימוד** על כל נושא שתכתבו
- **כתיבת שיעורים** לתחנות ברמות מתקדם, תואר ראשון ותואר שני, ולמושגים חופשיים

מפתח ה-AI לא יכול לשבת בתוך האפליקציה, כי כל אחד יכול לחלץ אותו משם. לכן הוא יושב בשרת קטן משלכם ב-Supabase, והאפליקציה מדברת רק איתו. השרת לא שומר שום מידע.

זמן משוער: 15–20 דקות. צריך מחשב עם [Node.js](https://nodejs.org).

## שלב 1: מפתח Gemini
1. היכנסו ל-[Google AI Studio](https://aistudio.google.com/apikey) עם חשבון Google.
2. לחצו **Create API key** והעתיקו את המפתח. הוא נראה כמו `AIza...`.
3. שמרו אותו בצד. **לא** משתפים אותו ולא מכניסים אותו לאפליקציה.

> ל-Gemini יש בדרך כלל מכסה חינמית שמספיקה לשימוש אישי. בדקו את התנאים העדכניים ב-AI Studio.

## שלב 2: פרויקט Supabase
1. צרו חשבון ב-[supabase.com](https://supabase.com) ולחצו **New project**. שם חופשי, אזור קרוב אליכם.
2. כשהפרויקט מוכן, היכנסו ל-**Project Settings → API Keys** והעתיקו:
   - את **Project URL**, שנראה כמו `https://abcd1234.supabase.co`
   - את ה-**Publishable key**, שנראה כמו `sb_publishable_...` (זה מפתח ציבורי, ומותר שיהיה באפליקציה)
3. ב-**Project Settings → General** העתיקו את ה-**Reference ID**, למשל `abcd1234`.

## שלב 3: העלאת הפונקציות
בטרמינל, מתוך התיקייה `feynmanmind`:

```bash
npx supabase login
npx supabase link --project-ref <REFERENCE_ID>

npx supabase secrets set LLM_PROVIDER=gemini GEMINI_API_KEY=<המפתח_משלב_1>

npx supabase functions deploy feynman-evaluate --no-verify-jwt
npx supabase functions deploy generate-flashcards --no-verify-jwt
npx supabase functions deploy generate-course --no-verify-jwt
npx supabase functions deploy generate-lesson --no-verify-jwt
```

- ברירת המחדל היא המודל `gemini-3.8-flash`. אפשר להחליף מודל עם `npx supabase secrets set LLM_MODEL=<שם_מודל>`.
- אין צורך במסד נתונים: אל תריצו `db push`.

## שלב 4: חיבור האפליקציה
1. באפליקציה, גללו לתחתית מסך הבית ← **הגדרות** ← **חיבור ל-AI**.
2. הדביקו את ה-**Project URL** ואת ה-**Publishable key** משלב 2.
3. לחצו **לשמור ולבדוק חיבור**.

| הודעה | מה עושים |
|---|---|
| "מחובר" | הכול עובד 🎉 |
| "לא הצלחנו להגיע לשרת" | בדקו את הכתובת ואת האינטרנט |
| "פונקציות ה-AI עוד לא הועלו" | חזרו לשלב 3 |
| "השרת ענה עם שגיאה" | בדקו שהגדרתם את `GEMINI_API_KEY` בשלב 3 |

אפשר גם לקבע את החיבור בזמן בנייה במקום בהגדרות: מעתיקים את `.env.example` ל-`.env.local` וממלאים את שני הערכים.

## עלויות ואבטחה
- **אחסון:** השרת לא שומר שום דבר. הוא מעביר את הבקשה ל-Gemini ומחזיר תשובה.
- **מגבלת שימוש:** לכל כתובת IP יש מגבלה בסיסית: 30 משובים, 15 יצירות כרטיסיות, 10 מפות לימוד ו-40 שיעורים בשעה.
- **כתובת השרת:** מי שיש לו את הכתובת יכול להשתמש בשרת. לשימוש אישי זה בסדר. אם משתפים את האפליקציה עם אחרים, הגדירו תקרת הוצאה ב-Google AI Studio.
