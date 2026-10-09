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

const lesson = (topic) => {
  const parts = {
    hook: `למה ${topic} חשוב בכלל?`,
    sections: [
      { heading: 'הרעיון', body: `${topic} הוא רעיון חשוב. `.repeat(8) },
      { heading: 'למה זה עובד', body: 'פסקה שנייה שמעמיקה ומסבירה למה זה נכון ולמה זה חשוב.' },
    ],
    example: { title: 'דוגמה: מספרים', body: 'חישוב קטן עם מספרים אמיתיים.' },
    misconception: { myth: 'רבים חושבים שזה פשוט.', truth: 'בעצם יש כאן עומק.' },
    connection: 'זה מתחבר לתחנה הקודמת.',
    check: [1, 2, 3].map((n) => ({ question: `שאלת בדיקה ${n}?`, options: ['נכונה', 'שגויה א', 'שגויה ב', 'שגויה ג'], correct: 0, why: 'כי כך.' })),
  };
  return {
    explanation: [parts.hook, ...parts.sections.map((x) => x.heading + '\n' + x.body)].join('\n\n'),
    parts,
    cards: [1, 2, 3, 4].map((n) => ({ question: `שאלה ${n} על ${topic}?`, answer: `תשובה ${n}.` })),
  };
};
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
      if (p.endsWith('/ask-lesson') && body.tutor_question)
        return json({ prompt_version: 'mock', answer: `הכוונה בשאלה "${body.tutor_question}" היא לחשוב על הסיבה. רמז: התחילו מהדוגמה.`, follow_ups: [] });
      if (p.endsWith('/ask-lesson'))
        return json({ prompt_version: 'mock', answer: `תשובה לשאלה "${body.question}": כך זה עובד.\n\nפסקה שנייה עם דוגמה.`, follow_ups: ['ומה קורה בחלל?'] });
      if (p.endsWith('/feynman-evaluate')) {
        // A conversation: 1st explanation → a question to answer; the answer → a sentence to refine; the revision → done.
        const turn = body.conversation?.length ?? 0;
        const step = turn === 0 ? 'answer_question' : turn === 2 ? 'refine_explanation' : 'done';
        const quote = step === 'refine_explanation' ? body.conversation[0].text.split(' ').slice(0, 3).join(' ') : '';
        const score = { answer_question: 60, refine_explanation: 48, done: 92 }[step];
        return json({ prompt_version: 'mock', evaluation: { comprehension_score: score, mastery_verdict: 'needs_work', jargon_detected: [], misconceptions: [], primary_gap: 'פער', socratic_question: 'ומה היה קורה אילו?', encouragement: 'יפה!', feedback: `משוב ${turn}: יפה, חסר הסבר למה.`, next_step: step, refine_quote: quote, coverage: [{ idea: 'מה זה וקטור', status: 'covered' }, { idea: 'למה מפרקים כוחות', status: 'missing' }], hints: ['רמז ראשון', 'רמז שני'], question_answer: 'זו התשובה לשאלה.', model_explanation: 'ככה מסבירים את זה היטב.' } });
      }
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
      await expectText('טעות נפוצה', 'lesson misconception');
      await expectText('דוגמה: מספרים', 'lesson example');
      await expectText('העתקה', 'copy button');
      await expectText('קריאה', 'lesson steps');
      await shot('05a-lesson-read');
      // Swipe to the next step (right-to-left reading: drag toward the right). Web swallows some mouse
      // drags (the phone uses a native pager), so try a few times until the step changes.
      const nextButton = () => page.getByRole('button', { name: /^הבא:/ }).first().textContent();
      for (let attempt = 0; attempt < 4 && (await nextButton())?.includes('בדיקה'); attempt++) {
        await page.mouse.move(20, 246);
        await page.mouse.down();
        for (let i = 1; i <= 30; i++) {
          await page.mouse.move(20 + (350 * i) / 30, 246);
          await page.waitForTimeout(10);
        }
        await page.mouse.up();
        await page.waitForTimeout(800);
      }
      const nextLabel = await nextButton();
      if (!nextLabel?.includes('הסבר')) failures.push(`swipe between steps: next button says "${nextLabel}"`);
      await shot('05b-swiped');
      // Check yourself: a wrong answer, then the right one.
      await page.getByRole('radio', { name: 'שגויה א' }).first().click();
      await expectText('לא בדיוק.', 'quiz wrong answer');
      await page.getByRole('radio', { name: 'נכונה' }).first().click();
      await expectText('נכון!', 'quiz right answer');
      await shot('05c-check');

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

      // Explaining is a conversation with the tutor.
      await page.getByRole('button', { name: 'להסביר במילים שלי' }).click();
      await page.waitForTimeout(800);
      await page.getByLabel(/^הסבירו את/).fill('וקטורים הם חצים שיש להם גודל וכיוון, ופירוק כוחות זה לחלק כוח לשני רכיבים.');
      await shot('13a-explain-write');
      await page.getByRole('button', { name: 'לקבל משוב' }).click();
      await page.waitForTimeout(1000);
      await expectText('משוב 0', 'tutor feedback');
      await expectText('מחכה לתשובה קצרה', 'tutor expects an answer');
      await shot('13b-explain-chat');
      await page.getByRole('radio', { name: /לא הבנתי את השאלה/ }).or(page.getByRole('button', { name: /לא הבנתי את השאלה/ })).first().click();
      await page.waitForTimeout(900);
      const clar = requests['/functions/v1/ask-lesson']?.at(-1);
      if (clar?.tutor_question !== 'ומה היה קורה אילו?') failures.push(`clarify request: ${JSON.stringify(clar)?.slice(0, 160)}`);
      await expectText('רמז, לא תשובה', 'clarification shown');
      await expectText('מה כיסית', 'coverage shown');
      await page.getByRole('button', { name: /רמז 1\/2/ }).click();
      await expectText('רמז ראשון', 'first hint');
      await page.getByRole('button', { name: /רמז 2\/2/ }).click();
      await page.getByRole('button', { name: /להראות את התשובה/ }).click();
      await expectText('זו התשובה לשאלה.', 'answer revealed');
      await page.getByRole('button', { name: 'להוסיף ככרטיסייה' }).click();
      await expectText('נוסף לכרטיסיות', 'card from tutor');
      await shot('13b2-explain-help');
      await page.getByLabel('כתבו תשובה לשאלה…').fill('הכוח היה מתפרק אחרת');
      await page.getByRole('button', { name: 'שליחה' }).click();
      await page.waitForTimeout(1000);
      const answerReq = requests['/functions/v1/feynman-evaluate']?.at(-1);
      if (answerReq?.level !== 'advanced') failures.push(`tutor level: ${answerReq?.level}`);
      if (answerReq?.conversation?.length !== 2 || answerReq?.language !== 'he') failures.push(`answer request: ${JSON.stringify(answerReq)?.slice(0, 200)}`);
      await expectText('לחדד את ההסבר', 'tutor asks to refine');
      await shot('13c-explain-refine');
      await page.getByRole('button', { name: 'לערוך את ההסבר' }).last().click();
      await page.waitForTimeout(600);
      if ((await page.getByLabel(/^הסבירו את/).inputValue()).length < 20) failures.push('revision editor is not prefilled');
      await shot('13d-explain-edit');
      await page.getByRole('button', { name: 'שליחה' }).click();
      await page.waitForTimeout(1000);
      await expectText('אפשר לסיים כאן', 'tutor done');
      await page.getByRole('button', { name: /הסבר לדוגמה/ }).click();
      await expectText('ככה מסבירים את זה היטב.', 'model explanation');
      await shot('13e-explain-done');
      await page.goBack();
      await page.waitForTimeout(800);
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
      // A library subject opens as a map too.
      await page.getByRole('button', { name: 'לפתוח כמפה' }).first().click();
      await page.waitForTimeout(800);
      await expectText('בשליטה', 'subject map');
      await expectText('להוסיף מושג למסלול', 'subject map add');
      await shot('09c-subject-map');
      await page.goBack();
      await page.waitForTimeout(800);
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
