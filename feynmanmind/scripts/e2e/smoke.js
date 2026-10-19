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
    for (const t of ['יסודות', 'תנועה וכוחות', 'כאן עצרתי', 'על מה המסלול מבוסס']) await expectText(t, 'course map');

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

      // The Learn tab no longer has "add" cards (the + button has them).
      await page.goto(APP);
      await page.waitForTimeout(900);
      await page.getByRole('tab', { name: /^לימוד/ }).click();
      await page.waitForTimeout(700);
      if ((await page.getByLabel('מסלול על כל נושא').count()) !== 0) failures.push('Learn tab still has the new-course card');
      // AI-built course (from the + menu's screen).
      await page.goto(`${APP}/new-course`);
      await page.waitForTimeout(900);
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
      // Learning on paper: make a month kit (black and white, paper saver) and check the pages.
      await page.getByRole('button', { name: 'ליצור ערכה לחודש' }).click();
      await page.waitForTimeout(800);
      await expectText('חיסכון מקסימלי', 'paper modes');
      await page.getByRole('radio', { name: /חיסכון ⭐/ }).click();
      await page.getByRole('tab', { name: 'שחור-לבן' }).click();
      await shot('14a-print-settings');
      const popupPromise = page.waitForEvent('popup');
      await page.getByRole('button', { name: 'הדפסה' }).click();
      const popup = await popupPromise;
      await popup.waitForLoadState();
      await popup.setViewportSize({ width: 1123, height: 794 });
      const kit = await popup.evaluate(() => ({
        pages: document.querySelectorAll('.page').length,
        bw: document.body.className,
        text: document.body.innerText.slice(0, 4000),
        // Anything cut off at the bottom of a page (content taller than the page or its boxes).
        cut: [...document.querySelectorAll('.page, .side, .half, .quarter, .col')].filter((e) => e.scrollHeight > e.clientHeight + 2).length,
      }));
      if (kit.cut) failures.push(`kit has ${kit.cut} boxes with cut-off content`);
      if (kit.bw !== 'bw') failures.push(`kit colour mode: ${kit.bw}`);
      if (kit.pages < 3) failures.push(`kit pages: ${kit.pages}`);
      if (!kit.text.includes('נושא')) failures.push('kit has no tracker');
      await popup.screenshot({ path: `${OUT}/${scheme}-14b-kit.png` });
      await popup.close();
      await page.waitForTimeout(600);
      await expectText('הערכה מוכנה', 'kit done');
      await shot('14c-print-done');
      await page.goBack();
      await page.waitForTimeout(600);
      await page.getByRole('tab', { name: /^אני/ }).click();
      await page.waitForTimeout(700);
      await expectText('הישגים', 'achievements');
      await expectText('תצוגה ונגישות', 'accessibility settings');
      await expectText('חיבור ל-AI', 'AI settings');
      await shot('11-me');
      await page.getByRole('button', { name: /^תצוגה ונגישות/ }).click();
      await page.waitForTimeout(400);
      // The style switch: classic, then back to the notebook; the choice is saved.
      await page.getByRole('radio', { name: /^קלאסי/ }).click();
      await page.waitForTimeout(400);
      if ((await page.evaluate(() => JSON.parse(localStorage.getItem('feynmanmind.prefs')).state.look)) !== 'classic') failures.push('look switch to classic not saved');
      await shot('11b-look-classic');
      await page.getByRole('radio', { name: /^מחברת/ }).click();
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
    if (scheme === 'light') {
      // Import lessons from JSON: a bad paste shows an error, a good one adds lessons (a duplicate is skipped),
      // and an imported station runs explain → reveal the reference → rate yourself.
      await page.goto(`${APP}/import`);
      await page.waitForTimeout(1000);
      const field = page.getByTestId('import-json');
      await field.waitFor({ timeout: 15000 });
      await field.fill('[{"topic": "x",}]');
      await page.getByRole('button', { name: 'לייבא את הטקסט' }).click();
      await page.waitForTimeout(400);
      await expectText('זה לא JSON תקין', 'invalid JSON error');
      await field.fill(JSON.stringify([{ topic: 'x', concept: 'y' }]));
      await page.getByRole('button', { name: 'לייבא את הטקסט' }).click();
      await page.waitForTimeout(400);
      await expectText('בשיעור 1 חסר השדה "reference\u200F"', 'missing field error');
      const rop = {
        topic: 'Buffer Overflow',
        concept: 'ROP (Return-Oriented Programming)',
        reference: 'כשהגנת NX חוסמת הרצת shellcode על המחסנית, בונים שרשרת מתוך gadgets ומשרשרים אותם.',
        keyPoints: ['NX חוסם הרצה על המחסנית', 'gadget מסתיים ב-ret', 'לא מזריקים קוד חדש'],
      };
      await field.fill(JSON.stringify([rop, { topic: 'Web', concept: 'XSS', reference: 'הזרקת סקריפט לדף של אתר אחר.' }, { ...rop, concept: 'rop (return-oriented programming)' }]));
      await page.getByRole('button', { name: 'לייבא את הטקסט' }).click();
      await page.waitForTimeout(600);
      await expectText('נוספו 2 שיעורים', 'import result');
      await expectText('1 כבר היו קיימים ודולגו', 'duplicate skipped');
      await shot('15a-import');
      // The same from a file: one new lesson, the rest skipped.
      const chooser = page.waitForEvent('filechooser');
      await page.getByRole('button', { name: 'לבחור קובץ JSON' }).click();
      await (await chooser).setFiles({ name: 'security.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify([rop, { topic: 'Web', concept: 'CSRF', reference: 'בקשה מזויפת בשם משתמש מחובר.' }])) });
      await page.waitForTimeout(800);
      await expectText('security.json', 'picked file name');
      await expectText('נוסף שיעור אחד', 'import from file');
      await shot('15a2-import-file');
      await page.getByRole('button', { name: 'לפתוח את הקורס' }).click();
      await page.waitForTimeout(1000);
      await expectText('Buffer Overflow', 'imported unit on the map');
      await shot('15b-imported-map');
      await page.reload();
      await page.waitForTimeout(1200);
      await expectText('ROP (Return-Oriented Programming)', 'imported lessons survive a reload');
      await page.goto(`${APP}/course/imported/${await page.evaluate(() => JSON.parse(localStorage.getItem('feynmanmind.db')).state.db.courses.imported.levels[0].stations[0].key)}`);
      await page.waitForTimeout(1000);
      if ((await page.getByTestId('self-reference').count()) !== 0) failures.push('reference visible before explaining');
      await page.getByTestId('self-explanation').fill('משתמשים בקטעי קוד שכבר קיימים בזיכרון במקום להזריק קוד.');
      await page.getByRole('button', { name: 'לחשוף את הסבר הייחוס' }).click();
      await page.waitForTimeout(700);
      await expectText('gadgets ומשרשרים', 'reference revealed');
      await page.getByRole('checkbox', { name: /gadget מסתיים/ }).click();
      await expectText('1 מתוך 3 נקודות מפתח', 'key points ticked');
      await page.getByRole('button', { name: '4 מתוך 5 כוכבים' }).click();
      await page.getByRole('button', { name: 'לשמור דירוג' }).click();
      await page.waitForTimeout(600);
      await expectText('נשמר: 80/100', 'self rating saved');
      await shot('15c-self-check');
      // Third step: no full lesson yet → the (mocked) AI writes one from the reference and key points.
      await page.getByRole('button', { name: 'שיעור מלא (AI)' }).click();
      await page.waitForTimeout(400);
      await page.getByRole('button', { name: 'לכתוב שיעור מלא עם AI' }).click();
      await page.waitForTimeout(1200);
      const up = requests['/functions/v1/generate-lesson']?.at(-1);
      if (!up?.reference?.includes('gadgets') || up?.key_points?.length !== 3) failures.push(`upgrade request lacks the reference: ${JSON.stringify(up)}`);
      await expectText('למה ROP (Return-Oriented Programming) חשוב בכלל?', 'upgraded lesson hook');
      await expectText('שאלת בדיקה 1?', 'upgraded lesson check questions');
      await shot('15d-full-lesson');
      // The map offers to upgrade the rest (XSS, CSRF).
      await page.goto(`${APP}/course/imported`);
      await page.waitForTimeout(1000);
      await expectText('2 שיעורים הם רק הסבר ייחוס', 'upgrade-all card');
      await page.getByRole('button', { name: /^לשדרג את כולם עם AI/ }).click();
      await page.waitForTimeout(3000);
      await expectText('הסתיים: נכתבו 2 שיעורים', 'queue finished');
      if ((await page.getByText('הם רק הסבר ייחוס').count()) !== 0) failures.push('upgrade-all card still shown after upgrading');
      await shot('15e-upgraded-map');
      // A named import: its own course, without automatic cards; the existing course is offered to add to.
      await page.goto(`${APP}/import`);
      await page.waitForTimeout(1000);
      await expectText('שיעורים מיובאים', 'existing imported course offered as a chip');
      await page.getByTestId('import-name').fill('אבטחת מידע');
      await expectText('ייווצר קורס חדש בשם הזה', 'new course hint');
      await page.getByRole('switch', { name: 'כרטיסיות אוטומטיות' }).click();
      await expectText('בלי כרטיסיות אוטומטיות', 'automatic cards off');
      await page.getByTestId('import-json').fill(JSON.stringify([{ topic: 'Web', concept: 'CSRF', reference: 'בקשה מזויפת בשם משתמש מחובר.' }]));
      await page.getByRole('button', { name: 'לייבא את הטקסט' }).click();
      await page.waitForTimeout(600);
      await expectText('נוסף שיעור אחד', 'named import result');
      await shot('15f-named-import');
      const saved = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('feynmanmind.db')).state.db.courses).map((c) => ({ id: c.id, title: c.title, lean: c.levels[0].stations.some((x) => x.lean), cards: c.levels[0].stations.reduce((n, x) => n + (x.cards ?? []).length, 0) })));
      const named = saved.find((c) => c.title === 'אבטחת מידע');
      if (!named || !named.id.startsWith('imp-') || !named.lean || named.cards !== 0) failures.push(`named import wrong: ${JSON.stringify(saved)}`);
      if (!saved.some((c) => c.id === 'imported')) failures.push('default imported course lost');
      await page.getByRole('button', { name: 'לפתוח את הקורס' }).click();
      await page.waitForTimeout(1000);
      await expectText('אבטחת מידע', 'named course on the map');
      await shot('15g-named-course');

      // Card store: an imported lesson with more than 3 never-reviewed cards can be trimmed to 3; one card can be deleted.
      const conceptId = await page.evaluate(() => {
        const raw = JSON.parse(localStorage.getItem('feynmanmind.db'));
        const db = raw.state.db;
        const subject = Object.values(db.subjects).find((s) => s.course_id === 'imported');
        const concept = Object.values(db.concepts).find((c) => subject && c.subject_id === subject.id && c.course_key);
        if (!concept) return null;
        const review = { ease_factor: 2.5, interval_days: 0, repetitions: 0, next_review_date: null, last_reviewed_at: null, last_quality: null };
        for (let i = 1; i <= 5; i++) {
          const id = `extra-${i}`;
          db.cards[id] = { id, concept_id: concept.id, question: `כרטיסייה עודפת ${i}?`, answer: 'x', created_at: new Date(Date.now() + i * 1000).toISOString(), review };
        }
        localStorage.setItem('feynmanmind.db', JSON.stringify(raw));
        return concept.id;
      });
      if (!conceptId) failures.push('no started imported station to test the card trim');
      else {
        const countOf = () => page.evaluate((id) => Object.values(JSON.parse(localStorage.getItem('feynmanmind.db')).state.db.cards).filter((c) => c.concept_id === id).length, conceptId);
        await page.goto(`${APP}/cards`);
        await page.waitForTimeout(1200);
        await expectText('יותר מ-3 כרטיסיות לשיעור', 'trim offer in the card store');
        await expectText('לחיצה ארוכה', 'selection hint');
        await shot('16a-card-store-trim');
        page.once('dialog', (d) => d.accept());
        await page.getByRole('button', { name: 'לצמצם ל-3 לכל שיעור' }).click();
        await page.waitForTimeout(600);
        const after = await countOf();
        if (after !== 3) failures.push(`trim left ${after} cards, expected 3`);
        await expectText('נמחקו', 'trim result');
        // Open the imported subject and its concept, then delete one card with its bin.
        await page.getByText('שיעורים מיובאים', { exact: false }).first().click();
        await page.waitForTimeout(300);
        const conceptTitle = await page.evaluate((id) => JSON.parse(localStorage.getItem('feynmanmind.db')).state.db.concepts[id].title, conceptId);
        await page.getByText(conceptTitle, { exact: true }).first().click();
        await page.waitForTimeout(300);
        await shot('16b-card-store-open');
        const question = await page.evaluate((id) => Object.values(JSON.parse(localStorage.getItem('feynmanmind.db')).state.db.cards).find((c) => c.concept_id === id).question, conceptId);
        const row = page.getByRole('button').filter({ has: page.getByText(question, { exact: true }) }).last();
        page.once('dialog', (d) => d.accept());
        await row.getByRole('button', { name: 'מחיקה' }).click();
        await page.waitForTimeout(500);
        if ((await countOf()) !== 2) failures.push(`single delete left ${await countOf()} cards, expected 2`);
        // Long-press selects a card; the bar deletes the selection.
        const q2 = await page.evaluate((id) => Object.values(JSON.parse(localStorage.getItem('feynmanmind.db')).state.db.cards).find((c) => c.concept_id === id).question, conceptId);
        const target = page.getByText(q2, { exact: true }).first();
        const box = await target.boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(900);
        await page.mouse.up();
        await page.waitForTimeout(300);
        await expectText('1 נבחרו', 'long-press selection');
        await shot('16c-card-store-select');
        page.once('dialog', (d) => d.accept());
        await page.getByRole('button', { name: 'מחיקה' }).last().click();
        await page.waitForTimeout(500);
        if ((await countOf()) !== 1) failures.push(`selection delete left ${await countOf()} cards, expected 1`);
        // Mid-review: "I don't need this card" deletes the card shown.
        const total = () => page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('feynmanmind.db')).state.db.cards).length);
        const before = await total();
        await page.goto(`${APP}/study`);
        await page.waitForTimeout(1200);
        page.once('dialog', (d) => d.accept());
        await page.getByRole('button', { name: 'לא צריך את הכרטיסייה' }).click();
        await page.waitForTimeout(600);
        if ((await total()) !== before - 1) failures.push(`review drop: ${before} → ${await total()}`);
        await shot('16d-review-drop');
        // Mixed Hebrew and English: a Hebrew sentence that starts with an English term still reads right to left.
        await page.evaluate((id) => {
          const raw = JSON.parse(localStorage.getItem('feynmanmind.db'));
          const review = { ease_factor: 2.5, interval_days: 0, repetitions: 0, next_review_date: null, last_reviewed_at: null, last_quality: null };
          raw.state.db.cards['bidi-1'] = { id: 'bidi-1', concept_id: id, question: 'ROP (Return-Oriented Programming) הוא טכניקה של מה?', answer: 'NX חוסם הרצת shellcode, ולכן משתמשים ב-gadgets.', created_at: new Date().toISOString(), review };
          localStorage.setItem('feynmanmind.db', JSON.stringify(raw));
        }, conceptId);
        await page.goto(`${APP}/cards`);
        await page.waitForTimeout(1200);
        await page.getByLabel('חיפוש בשאלות ובתשובות').fill('Return-Oriented');
        await page.waitForTimeout(400);
        const marked = await page.evaluate(() => [...document.querySelectorAll('div')].some((d) => d.childElementCount === 0 && d.textContent.startsWith('\u200FROP (Return-Oriented')));
        if (!marked) failures.push('mixed Hebrew/English text did not get a right-to-left mark');
        await shot('16e-mixed-text');
      }
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
