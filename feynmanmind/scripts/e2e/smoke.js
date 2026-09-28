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
    await shot('01-home');
    await expectText('פיזיקה', 'home lists built-in courses');

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
      await page.getByRole('button', { name: 'להתחיל את התחנה' }).click();
      await page.waitForTimeout(700);
      await shot('05-station-started');

      // AI-built course.
      await page.goto(APP);
      await page.waitForTimeout(900);
      await page.getByLabel('מסלול על כל נושא').fill('אסטרונומיה');
      await page.getByRole('button', { name: 'לבנות מפת לימוד' }).click();
      await page.waitForTimeout(1500);
      await expectText('תחנה 4.1', 'AI course map');
      await shot('06-ai-course');
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
