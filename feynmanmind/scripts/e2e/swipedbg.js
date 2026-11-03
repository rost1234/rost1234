const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'he-IL' });
  const page = await ctx.newPage();
  await page.addInitScript(() => localStorage.setItem('feynmanmind.prefs', JSON.stringify({ state: { language: 'he', onboardingDone: true }, version: 1 })));
  await page.goto('http://localhost:8123/course/physics/' + process.argv[2]);
  await page.waitForTimeout(2500);
  const label = () => page.getByRole('button', { name: /^הבא:/ }).first().textContent().catch(() => '?');
  console.log('start', await label());
  for (const [from, to] of [[370, 20], [20, 370], [20, 370], [370, 20]]) {
    await page.mouse.move(from, 246); await page.mouse.down();
    for (let i = 1; i <= 30; i++) { await page.mouse.move(from + ((to - from) * i) / 30, 246); await page.waitForTimeout(10); }
    await page.mouse.up(); await page.waitForTimeout(800);
    console.log(from, '->', to, await label());
  }
  await b.close();
})();
