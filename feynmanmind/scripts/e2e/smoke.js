// Smoke test of the main flows in the web build, with the AI server mocked.
// Saves screenshots and exits non-zero if any check or page error fails.
//
//   node smoke.js [screenshot dir] [app url]
const { chromium } = require('playwright');
const fs = require('fs');

const OUT = process.argv[2] || 'screenshots';
const APP = process.argv[3] || 'http://localhost:8123';
const API = 'https://mock-project.supabase.co';
const PREFS = { state: { language: 'he', theme: 'auto', onboardingDone: true, remindersEnabled: false, reminderHour: 19, defaultCardCount: 15, aiUrl: API, aiKey: 'sb_publishable_test' }, version: 1 };
fs.mkdirSync(OUT, { recursive: true });

const lesson = (topic) => ({
  explanation: `${topic} הוא רעיון חשוב. `.repeat(12) + '\n\nפסקה שנייה שמעמיקה ומסבירה למה זה נכון ולמה זה חשוב.',
  cards: [1, 2, 3, 4].map((n) => ({ question: `שאלה ${n} על ${topic}?`, answer: `תשובה ${n}.` })),
});
const q = { question: 'שאלה?', options: ['נכון', 'לא', 'גם לא', 'בכלל לא'], correct: 0 };
const coursePlan = {
  title: 'אסטרונומיה',
  description: 'מהשמיים הנראים ועד קוסמולוגיה.',
  levels: ['foundations', 'advanced', 'bachelor', 'master'].map((key, i) => ({
    key,
    stations: [1, 2, 3].map((n) => ({ key: `${key[0]}${n}`, title: `תחנה ${i + 1}.${n}`, summary: 'תקציר', unit: `יחידה ${i + 1}` })),
    quiz: [q, q, q],
  })),
};

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const failures = [];
  const requests = {};

  for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'he-IL', colorScheme: scheme });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => failures.push(`[${scheme}] page error: ${e.message}`));
    await page.route(`${API}/**`, async (route) => {
      const req = route.request();
      const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: cors });
      const p = new URL(req.url()).pathname;
      const body = req.postDataJSON() ?? {};
      (requests[p] ??= []).push(body);
      const json = (b) => route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(b) });
      if (p.endsWith('/generate-lesson')) return json({ prompt_version: 'mock', lesson: lesson(body.concept_title) });
      if (p.endsWith('/generate-course')) return json({ prompt_version: 'mock', course: coursePlan });
      if (p.endsWith('/ask-lesson'))
        return json({ prompt_version: 'mock', answer: `תשובה לשאלה "${body.question}": כך זה עובד.\n\nפסקה שנייה עם דוגמה.`, follow_ups: ['ומה קורה בחלל?'] });
      if (p.endsWith('/feynman-evaluate'))
        return json({ prompt_version: 'mock', evaluation: { comprehension_score: 60, mastery_verdict: 'needs_work', jargon_detected: [], misconceptions: [], primary_gap: 'פער', socratic_question: 'ומה היה קורה אילו?', encouragement: 'יפה!' } });
      return route.fulfill({ status: 404, headers: cors, body: '{}' });
    });
    const shot = async (name) => {
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT}/${scheme}-${name}.png` });
    };
    const expectText = async (text, why) => {
      if ((await page.getByText(text, { exact: false }).count()) === 0) failures.push(`[${scheme}] missing "${text}" (${why})`);
    };

    await page.goto(APP);
    await page.evaluate((prefs) => localStorage.setItem('feynmanmind.prefs', JSON.stringify(prefs)), PREFS);
    await page.goto(APP);
    await page.waitForTimeout(1200);
    await shot('01-today');
    await expectText('היום שלי', 'today tab shows the daily checklist');

    await page.goto(`${APP}/course/physics`);
    await page.waitForTimeout(1200);
    await shot('02-map-top');
    for (const t of ['יסודות', 'יחידה 1', 'על מה המסלול מבוסס']) await expectText(t, 'course map');

    if (scheme === 'light') {
      // Placement: answer the foundations questions right, then "don't know" → placed at level 2.
      await page.getByRole('button', { name: 'למבחן המיקום' }).click();
      await page.waitForTimeout(700);
      await shot('03-placement');
      for (const answer of ['ממשיך באותה מהירות ובאותו כיוון', 'קטנה פי שניים', 'אין חומר שיעביר את הגל']) {
        await page.getByRole('button', { name: answer }).click();
        await page.waitForTimeout(250);
      }
      for (let i = 0; i < 3; i++) {
        await page.getByRole('button', { name: 'לא יודע/ת' }).click();
        await page.waitForTimeout(250);
      }
      await page.waitForTimeout(600);
      await shot('04-placement-result');
      await expectText('מתקדם (תיכון)', 'placed at advanced');

      // The next station is the first advanced one; its lesson is written by the (mocked) AI.
      await page.getByRole('button', { name: 'למפת הלימוד' }).click();
      await page.waitForTimeout(900);
      await page.getByRole('button', { name: 'להמשיך מאיפה שעצרתם' }).click();
      await page.waitForTimeout(800);
      await page.getByRole('button', { name: 'לכתוב את השיעור עם AI' }).click();
      await page.waitForTimeout(1200);
      const req = requests['/functions/v1/generate-lesson']?.at(-1);
      if (req?.level !== 'advanced' || !req?.unit || req?.course_title !== 'פיזיקה') failures.push(`lesson request: ${JSON.stringify(req)?.slice(0, 200)}`);
      await expectText('העתקה', 'copy button');
      await expectText('קריאה', 'lesson steps');
      await shot('05a-lesson-read');
      await page.getByRole('button', { name: 'הבא: נקודות מפתח' }).click();
      await page.waitForTimeout(500);
      await expectText('מה חשוב לזכור', 'lesson key points');

      // Ask about the lesson in the bottom sheet: typed question, then a suggested follow-up.
      await page.getByRole('button', { name: /^שאל שאלה/ }).click();
      await page.waitForTimeout(600);
      await page.getByLabel('שאלות על השיעור').fill('למה זה ככה?');
      await page.getByRole('button', { name: 'לשאול' }).click();
      await page.waitForTimeout(900);
      await expectText('תשובה לשאלה "למה זה ככה?"', 'AI answer shown');
      const ask = requests['/functions/v1/ask-lesson']?.at(-1);
      if (ask?.level !== 'advanced' || !ask?.lesson || ask?.question !== 'למה זה ככה?') failures.push(`ask request: ${JSON.stringify(ask)?.slice(0, 200)}`);
      await page.getByRole('button', { name: 'ומה קורה בחלל?' }).click();
      await page.waitForTimeout(900);
      if (requests['/functions/v1/ask-lesson']?.at(-1)?.history?.length !== 1) failures.push('follow-up did not send history');
      await shot('05-lesson-questions');
      await page.getByRole('button', { name: 'סגירה' }).last().click();
      await page.waitForTimeout(600);

      // Moving on to "explain" starts the station; "practice" offers its cards.
      await page.getByRole('button', { name: 'הבא: הסבר' }).click();
      await page.waitForTimeout(900);
      await expectText('הסבירו במילים שלכם', 'explain step');
      await shot('06-station-explain');
      await page.getByRole('button', { name: 'הבא: תרגול' }).click();
      await page.waitForTimeout(700);
      await expectText('לחזור על הכרטיסיות', 'practice step');
      await shot('06b-station-practice');

      // AI-built course (on the Learn tab).
      await page.goto(APP);
      await page.waitForTimeout(900);
      await page.getByRole('tab', { name: /^לימוד/ }).click();
      await page.waitForTimeout(700);
      await page.getByLabel('מסלול על כל נושא').fill('אסטרונומיה');
      await page.getByRole('button', { name: 'לבנות מפת לימוד' }).click();
      await page.waitForTimeout(1500);
      await expectText('תחנה 4.1', 'AI course map');
      await shot('07-ai-course');

      // Tabs: Today (plan), Learn, Review (calendar, settings), Me (accessibility, settings).
      await page.goto(APP);
      await page.waitForTimeout(1000);
      await expectText('הצעד הבא שלך', 'next step');
      await expectText('שיעור חדש', 'plan suggests the next lesson');
      await expectText('המשך מאיפה שעצרת', 'continue card');
      await shot('08-today-plan');
      await page.getByRole('button', { name: 'הוספה מהירה' }).click();
      await page.waitForTimeout(500);
      await expectText('מושג חדש', 'quick add menu');
      await shot('08b-quick-add');
      await page.getByRole('button', { name: 'ביטול' }).last().click();
      await page.waitForTimeout(500);
      await page.getByRole('tab', { name: /^לימוד/ }).click();
      await page.waitForTimeout(700);
      await expectText('הקורסים שלי', 'my courses');
      await expectText('גלו קורסים', 'catalog');
      await shot('09-learn');
      await page.getByLabel('חיפוש').fill('תנועה');
      await page.waitForTimeout(500);
      await expectText('תוצאות', 'search results');
      await shot('09b-learn-search');
      await page.getByRole('button', { name: 'ניקוי החיפוש' }).click();
      await page.waitForTimeout(300);
      await page.getByRole('tab', { name: /^חזרות/ }).click();
      await page.waitForTimeout(700);
      await expectText('השבוע', 'week strip');
      await expectText('הגדרות חזרה', 'review settings');
      await shot('10-review');
      await page.getByRole('button', { name: 'חודש מלא' }).click();
      await page.waitForTimeout(400);
      await expectText('ימים שחזרתם', 'calendar legend');
      await shot('10b-review-month');
      await page.getByRole('tab', { name: /^אני/ }).click();
      await page.waitForTimeout(700);
      await expectText('הישגים', 'achievements');
      await expectText('תצוגה ונגישות', 'accessibility settings');
      await expectText('חיבור ל-AI', 'AI settings');
      await shot('11-me');
      await page.getByRole('button', { name: /^תצוגה ונגישות/ }).click();
      await page.waitForTimeout(400);
      // Larger text applies app-wide.
      await page.getByRole('tab', { name: 'גדול מאוד' }).click();
      await page.waitForTimeout(500);
      await shot('12-me-xlarge-text');
      await page.getByRole('tab', { name: 'רגיל' }).click();

      // Swiping between tabs: drag across the screen and the selected tab should change.
      // Start from the top of Learn (it kept its scroll from earlier steps), then go back to Today.
      await page.getByRole('tab', { name: /^לימוד/ }).click();
      await page.waitForTimeout(500);
      await page.evaluate(() => document.querySelectorAll('div').forEach((d) => { if (d.scrollTop) d.scrollTop = 0; }));
      await page.getByRole('tab', { name: /^היום/ }).click();
      await page.waitForTimeout(600);
      const selected = () => page.evaluate(() => location.pathname);
      const before = await selected();
      // Drag along the title row (no buttons there on either tab). On web the first mouse gesture is
      // swallowed, so drag right-to-left first (toward no tab: nothing happens), then left-to-right,
      // which in RTL moves to the next tab.
      for (const [from, to] of [[370, 20], [20, 370]]) {
        await page.mouse.move(from, 90);
        await page.mouse.down();
        for (let i = 1; i <= 30; i++) {
          await page.mouse.move(from + ((to - from) * i) / 30, 90);
          await page.waitForTimeout(10);
        }
        await page.mouse.up();
        await page.waitForTimeout(900);
      }
      const after = await selected();
      if (after !== "/learn") failures.push(`swipe went from ${before} to ${after}, expected /learn`);
      else console.log(`swipe: ${before} → ${after}`);
    }
    await ctx.close();
  }

  await browser.close();
  if (failures.length) {
    console.error(`FAILED (${failures.length}):\n- ${failures.join('\n- ')}`);
    process.exit(1);
  }
  console.log(`OK. Screenshots in ${OUT}/`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
