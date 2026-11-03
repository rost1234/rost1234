/**
 * Draws the printable month kit as one HTML document (A4 landscape pages):
 * the wall calendar, the topic tracker, the lessons and the cut-out cards.
 * Four paper modes, in colour or black and white. Pure: no React Native.
 */
import { lessonPlainText } from '@/content/lesson';
import type { MonthPlan, PlannedStation } from './plan';

/** full: one lesson a page · saver: calendar+tracker on one page, two lessons a page · max: four summaries a page · track: calendar+tracker only. */
export type PaperMode = 'full' | 'saver' | 'max' | 'track';

export interface KitOptions {
  mode: PaperMode;
  /** false = black and white (no coloured fills: saves ink, prints well on any printer). */
  color: boolean;
  /** Header line, e.g. "נובמבר 2026". */
  monthLabel: string;
  /** e.g. "פיזיקה" or "פיזיקה + ביולוגיה". */
  title: string;
  /** Reviews already scheduled in the app, by date: titles to show on the calendar. */
  carryover?: Record<string, string[]>;
}

const CARDS_PER_PAGE: Record<PaperMode, number> = { full: 18, saver: 24, max: 0, track: 0 };

/** Pages the kit will take (before double-sided printing). */
export function pageCount(mode: PaperMode, stations: number, cards: number): number {
  switch (mode) {
    case 'full':
      return 2 + stations + Math.ceil(cards / CARDS_PER_PAGE.full);
    case 'saver':
      return 1 + Math.ceil(stations / 2) + Math.ceil(cards / CARDS_PER_PAGE.saver);
    case 'max':
      return 1 + Math.ceil(stations / 4);
    case 'track':
      return 1;
  }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const paras = (t: string) =>
  t
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p)}</p>`)
    .join('');
const LETTERS = 'אבגד';
const WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const dayNum = (iso: string) => Number(iso.slice(8));
const dm = (iso: string) => `${dayNum(iso)}.${Number(iso.slice(5, 7))}`;
const box = '<span class="bx"></span>';

function calendar(plan: MonthPlan, opts: KitOptions, compact: boolean): string {
  const lead = plan.days[0]!.weekday;
  const cells = WEEKDAYS.map((w, i) => `<div class="wh${i === 6 ? ' rest' : ''}">${w}</div>`);
  for (let i = 0; i < lead; i++) cells.push('<div class="day empty"></div>');
  for (const d of plan.days) {
    const items: string[] = [];
    for (const n of d.learn) {
      const s = plan.stations[n - 1]!;
      items.push(compact ? `<div class="it new">${box}<span>📖 ${n} · 🗣</span></div>` : `<div class="it new">${box}<span>📖 ${n}. ${esc(s.title)}</span></div><div class="it">${box}<span>🗣 להסביר בקול</span></div>`);
    }
    if (d.review.length) items.push(`<div class="it">${box}<span>🔁 ${compact ? '' : 'חזרה: '}${d.review.join(', ')}</span></div>`);
    const carry = opts.carryover?.[d.date] ?? [];
    if (carry.length) items.push(`<div class="it old">${box}<span>↺ ${esc(carry.slice(0, 2).join(', '))}${carry.length > 2 ? ` +${carry.length - 2}` : ''}</span></div>`);
    if (d.quiz) items.push(`<div class="it">${box}<span>⭐ ${compact ? 'מבחן שבוע' : 'מבחן עצמי על השבוע'}</span></div>`);
    if (d.rest && !items.length) items.push('<div class="it muted">מנוחה</div>');
    const cls = `day${compact ? ' sm' : ''}${d.rest ? ' rest' : d.quiz ? ' fri' : ''}`;
    cells.push(`<div class="${cls}"><span class="n">${dayNum(d.date)}</span>${items.join('')}${compact ? '' : '<span class="min">דק׳ ____</span>'}</div>`);
  }
  const weeks = Math.ceil((cells.length - 7) / 7);
  while (cells.length < 7 + weeks * 7) cells.push('<div class="day empty"></div>');
  return `<div class="cal" style="grid-template-rows:6mm repeat(${weeks},1fr)">${cells.join('')}</div>`;
}

function header(title: string, sub: string, right = ''): string {
  return `<div class="top"><div><h1>${title}</h1><div class="sub">${sub}</div></div>${right}</div>`;
}

const goal = '<div class="goal">יעד יומי: <span class="line"></span> דק׳</div>';

function trackerRows(plan: MonthPlan, compact: boolean): string {
  return plan.stations
    .map((s) => {
      // Compact rows keep the box and the date on one line so a whole month fits next to the calendar.
      const cell = (date: string | null) => (compact ? `<td class="c">${box} ${date ? dayNum(date) : '→'}</td>` : `<td>${box}<small>${date ? dm(date) : 'בחודש הבא'}</small></td>`);
      const reviews = s.reviews.map(cell).join('');
      return `<tr><td><span class="num">${s.n}</span></td><td class="t">${esc(s.title)}${compact ? '' : `<small>${esc(s.courseTitle)}</small>`}</td>${cell(s.learn)}<td class="stars">☆☆☆☆☆</td>${reviews}${compact ? '' : '<td class="stars">☆☆☆☆☆</td>'}</tr>`;
    })
    .join('');
}

function fullCalendarPage(plan: MonthPlan, opts: KitOptions): string {
  const legend = plan.stations.map((s) => `<div><span class="num">${s.n}</span>${esc(s.title)}</div>`).join('');
  const streak = plan.days.map((d) => `<span>${dayNum(d.date)}</span>`).join('');
  return `<div class="page">${header(`${esc(opts.monthLabel)} · ${esc(opts.title)}`, 'FeynmanMind · דף חודשי לתלייה · מסמנים ✓ בכל משבצת שבוצעה', goal)}
<div class="wrap">${calendar(plan, opts, false)}<div class="side">
<div class="card legend"><h3>השיעורים של החודש</h3>${legend}</div>
<div class="card"><h3>רצף ימים: צובעים כל יום שלמדתם</h3><div class="streak">${streak}</div></div>
<div class="card"><h3>איך עובדים עם הדף</h3>📖 קוראים את השיעור<br>🗣 מסבירים בקול בלי להסתכל, ובודקים מה חסר<br>🔁 חזרה: עוברים על הכרטיסיות של הנושאים במספרים<br>⭐ מבחן עצמי: עונים על כל שאלות השבוע${opts.carryover ? '<br>↺ חזרות שכבר תוזמנו באפליקציה' : ''}</div>
</div></div></div>`;
}

function trackerPage(plan: MonthPlan, opts: KitOptions): string {
  return `<div class="page">${header(`מעקב נושאים · ${esc(opts.monthLabel)}`, 'כל נושא חוזר אחרי יום, 3 ימים, שבוע ושבועיים, וכך נשאר בזיכרון. התאריך הוא התכנון; מסמנים ✓ כשמבצעים.')}
<table><tr><th>#</th><th>נושא</th><th>למדתי</th><th>הסבר בקול: כמה הבנתי (1–5)</th><th>חזרה 1<br>+יום</th><th>חזרה 2<br>+3 ימים</th><th>חזרה 3<br>+שבוע</th><th>חזרה 4<br>+שבועיים</th><th>בסוף החודש (1–5)</th></tr>${trackerRows(plan, false)}</table>
<div class="steps"><div><b>1. לקרוא</b>קוראים את השיעור ומסמנים מה לא ברור.</div><div><b>2. להסביר</b>מכסים את הדף ומסבירים בקול, כאילו לילד בן 12.</div><div><b>3. לבדוק</b>חוזרים לשיעור: מה שכחתם? מה הסברתם במילים קשות?</div><div><b>4. לדרג</b>צובעים כוכבים: 1 = לא הצלחתי, 5 = יכול ללמד את זה.</div><div><b>5. לחזור</b>בימי החזרה עוברים על הכרטיסיות. כרטיס ששכחתם חוזר מחר.</div></div></div>`;
}

function combinedPage(plan: MonthPlan, opts: KitOptions): string {
  return `<div class="page">${header(`${esc(opts.monthLabel)} · ${esc(opts.title)}`, '📖 שיעור חדש + 🗣 הסבר בקול · 🔁 חזרה על הנושאים במספרים · ⭐ מבחן עצמי · מסמנים ✓', goal)}
<div class="wrap">${calendar(plan, opts, true)}<div class="side wide"><table class="mini${plan.stations.length > 16 ? ' dense' : ''}"><tr><th>#</th><th>נושא</th><th>למדתי</th><th>הבנתי</th><th>+1</th><th>+3</th><th>+7</th><th>+14</th></tr>${trackerRows(plan, true)}</table>
<div class="card">חזרה = עוברים על "מה חשוב לזכור" של הנושא ועונים בלי להסתכל. נושא עם 1–2 כוכבים חוזר גם מחר.</div></div></div></div>`;
}

function checkBlock(s: PlannedStation, inline: boolean): string {
  const check = s.parts?.check ?? [];
  if (!check.length) return '';
  const qs = check.map((q, k) => `<div class="q"><b>${k + 1}. ${esc(q.question)}</b>${inline ? ' ' : '<br>'}${q.options.map((o, j) => `${LETTERS[j]}. ${esc(o)}`).join(' &nbsp; ')}</div>`).join('');
  const answers = check.map((q, k) => `${k + 1}: ${LETTERS[q.correct]}`).join(' · ');
  return `<div class="box chk"><h4>✅ בדקו את עצמכם</h4>${qs}<div class="ans">תשובות: ${answers}</div></div>`;
}

function missing(s: PlannedStation): string {
  return s.text ? paras(s.text) : `<p>${esc(s.summary)}</p><p class="muted">השיעור המלא ייכתב באפליקציה בפעם הראשונה שתפתחו את התחנה.</p>`;
}

function lessonPage(s: PlannedStation, total: number): string {
  const P = s.parts;
  const body = P
    ? `<div class="col"><div class="hook">🎯 ${esc(P.hook)}</div>${P.sections.map((x) => `<h4>${esc(x.heading)}</h4>${paras(x.body)}`).join('')}</div>
<div class="col">${P.example ? `<div class="box ex"><h4>🔍 ${esc(P.example.title)}</h4>${paras(P.example.body)}</div>` : ''}${P.misconception ? `<div class="box mis"><h4>⚠️ טעות נפוצה</h4><p>✗ ${esc(P.misconception.myth)}</p><p>✓ ${esc(P.misconception.truth)}</p></div>` : ''}${P.connection ? `<p class="conn">🔗 ${esc(P.connection)}</p>` : ''}${checkBlock(s, false)}<div class="box expl"><h4>🗣 עכשיו הסבירו במילים שלכם (בלי להסתכל)</h4><div class="lines"></div></div></div>`
    : `<div class="col">${missing(s)}</div><div class="col"><div class="box expl"><h4>🗣 הסבירו במילים שלכם</h4><div class="lines"></div></div></div>`;
  return `<div class="page">${header(`<span class="num big">${s.n}</span> ${esc(s.title)}`, `${esc(s.courseTitle)}${s.unit ? ` · ${esc(s.unit)}` : ''} · שיעור ${s.n} מתוך ${total} · מתוכנן ל-${dm(s.learn)}`)}<div class="cols">${body}</div></div>`;
}

function cardsInline(s: PlannedStation, label: string): string {
  if (!s.cards.length) return '';
  return `<div class="kp"><b>${label}</b>${s.cards.map((c) => `<div class="qa"><span>${esc(c.question)}</span><span class="a2">${esc(c.answer)}</span></div>`).join('')}</div>`;
}

function lessonHalf(s: PlannedStation): string {
  const P = s.parts;
  const head = `<div class="ht"><span class="num">${s.n}</span> <b>${esc(s.title)}</b> <small>· ${esc(s.courseTitle)} · ${dm(s.learn)}</small></div>`;
  if (!P) return `<div class="half">${head}${missing(s)}${cardsInline(s, '🃏 כרטיסיות (מכסים את התשובה):')}</div>`;
  return `<div class="half">${head}<div class="hook2">🎯 ${esc(P.hook)}</div>${P.sections.map((x) => `<h4>${esc(x.heading)}</h4>${paras(x.body)}`).join('')}${P.example ? `<div class="box ex"><b>🔍 ${esc(P.example.title)}</b>${paras(P.example.body)}</div>` : ''}${P.misconception ? `<div class="box mis"><b>⚠️</b> ✗ ${esc(P.misconception.myth)} ✓ ${esc(P.misconception.truth)}</div>` : ''}${checkBlock(s, true)}${cardsInline(s, '🃏 כרטיסיות (מכסים את התשובה):')}</div>`;
}

function lessonQuarter(s: PlannedStation): string {
  const P = s.parts;
  const head = `<div class="ht"><span class="num">${s.n}</span> <b>${esc(s.title)}</b> <small>· ${dm(s.learn)}</small></div>`;
  const q = P?.check[0];
  const check = q ? `<div class="box chk"><b>✅</b> ${esc(q.question)} ${q.options.map((o, j) => `${LETTERS[j]}. ${esc(o)}`).join(' · ')} <span class="ans">${LETTERS[q.correct]}</span></div>` : '';
  return `<div class="quarter">${head}${P ? `<div class="hook2">🎯 ${esc(P.hook)}</div>` : `<p>${esc(s.summary)}</p>`}${cardsInline(s, '💡 מה חשוב לזכור (מכסים את הצד השמאלי):')}${P?.misconception ? `<div class="box mis"><b>⚠️</b> ✓ ${esc(P.misconception.truth)}</div>` : ''}${check}<div class="sub">🗣 הסבירו בקול בלי להסתכל, ואז בדקו מול "מה חשוב לזכור".</div></div>`;
}

function packed(plan: MonthPlan, per: 2 | 4): string {
  const out: string[] = [];
  for (let i = 0; i < plan.stations.length; i += per) {
    const group = plan.stations.slice(i, i + per);
    out.push(`<div class="page"><div class="grid${per}">${group.map((s) => (per === 2 ? lessonHalf(s) : lessonQuarter(s))).join('')}</div></div>`);
  }
  return out.join('');
}

function cardPages(plan: MonthPlan, per: number): string {
  const all = plan.stations.flatMap((s) => s.cards.map((c) => ({ s, c })));
  const out: string[] = [];
  for (let i = 0; i < all.length; i += per) {
    const slice = all.slice(i, i + per);
    const cells = slice.map(({ s, c }) => `<div class="fc"><div class="q"><span class="lbl">${s.n} · שאלה</span>${esc(c.question)}</div><div class="a"><span class="lbl">תשובה</span>${esc(c.answer)}</div></div>`).join('') + '<div class="fc"></div>'.repeat(per - slice.length);
    out.push(`<div class="page">${header(`כרטיסיות לגזירה · ${i / per + 1}`, '✂ גוזרים לאורך הקו המקווקו ומקפלים בקו המנוקד: השאלה מקדימה, התשובה מאחור. כרטיס ששכחתם עובר לערימת "מחר".')}<div class="cards${per > 18 ? ' c24' : ''}">${cells}</div></div>`);
  }
  return out.join('');
}

export function buildKitHtml(plan: MonthPlan, opts: KitOptions): string {
  let pages = '';
  if (opts.mode === 'full') pages = fullCalendarPage(plan, opts) + trackerPage(plan, opts) + plan.stations.map((s) => lessonPage(s, plan.stations.length)).join('') + cardPages(plan, CARDS_PER_PAGE.full);
  else if (opts.mode === 'saver') pages = combinedPage(plan, opts) + packed(plan, 2) + cardPages(plan, CARDS_PER_PAGE.saver);
  else if (opts.mode === 'max') pages = combinedPage(plan, opts) + packed(plan, 4);
  else pages = combinedPage(plan, opts);
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>${esc(opts.monthLabel)} · ${esc(opts.title)}</title><style>${CSS}</style></head><body class="${opts.color ? '' : 'bw'}">${pages}</body></html>`;
}

/** Plain text of a station's lesson (the parts, or its text). */
export const stationText = (s: { parts: PlannedStation['parts']; text: string }) => (s.parts ? lessonPlainText(s.parts) : s.text);

const CSS = `
@page { size: A4 landscape; margin: 0 }
*{box-sizing:border-box} html,body{margin:0}
body{font-family:"Noto Sans Hebrew","Arial Hebrew",Arial,sans-serif;color:#1b1b2f;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:297mm;height:209mm;padding:9mm 10mm;page-break-after:always;break-after:page;display:flex;flex-direction:column;gap:3mm;overflow:hidden}
.page:last-child{page-break-after:auto;break-after:auto}
h1{margin:0;font-size:19pt} .sub{color:#555;font-size:8.5pt} .muted{color:#888}
.top{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2pt solid #4F46E5;padding-bottom:2mm;gap:4mm}
.goal{font-size:9pt;white-space:nowrap} .line{display:inline-block;border-bottom:0.6pt solid #333;width:22mm;height:4mm}
.wrap{display:flex;gap:4mm;flex:1;min-height:0}
.cal{flex:1;display:grid;grid-template-columns:repeat(7,1fr);gap:1.2mm}
.wh{background:#4F46E5;color:#fff;font-weight:800;font-size:8.5pt;text-align:center;border-radius:1.5mm;line-height:6mm}
.wh.rest{background:#9a9ab0}
.day{border:0.6pt solid #b9b9cc;border-radius:1.5mm;padding:1.2mm 1.5mm;font-size:7.3pt;display:flex;flex-direction:column;gap:0.7mm;position:relative;overflow:hidden}
.day .n{font-weight:800;font-size:10pt} .day.sm{font-size:7pt;gap:0.5mm} .day.sm .n{font-size:9pt}
.day.rest{background:#f3f3f8} .day.fri{background:#fff8e6} .day.empty{border:none;background:none}
.it{display:flex;gap:1mm;align-items:flex-start;line-height:1.25} .it.new{font-weight:700;color:#3b33c4} .it.old{color:#555}
.bx{display:inline-block;width:3mm;height:3mm;border:0.7pt solid #333;border-radius:0.6mm;flex:none;margin-top:0.3mm;vertical-align:middle}
.min{position:absolute;bottom:1mm;left:1.5mm;font-size:6.5pt;color:#777}
.side{width:62mm;display:flex;flex-direction:column;gap:2.5mm;font-size:8pt} .side.wide{width:118mm}
.card{border:0.6pt solid #b9b9cc;border-radius:2mm;padding:2mm 2.5mm}
.card h3{margin:0 0 1.2mm;font-size:9pt;color:#4F46E5}
.legend div{display:flex;gap:1.5mm;line-height:1.45}
.num{display:inline-grid;place-items:center;width:4.2mm;height:4.2mm;border-radius:50%;background:#4F46E5;color:#fff;font-size:6.5pt;font-weight:800;flex:none}
.num.big{width:7mm;height:7mm;font-size:11pt;vertical-align:middle}
.streak{display:grid;grid-template-columns:repeat(10,1fr);gap:0.8mm}
.streak span{border:0.6pt solid #999;border-radius:0.6mm;height:4.2mm;font-size:5.5pt;color:#999;text-align:center;line-height:4.2mm}
table{border-collapse:collapse;width:100%;font-size:8.2pt}
th,td{border:0.6pt solid #b9b9cc;padding:1.2mm 1.4mm;text-align:center}
th{background:#eeeefa;font-size:7.8pt} td.t{text-align:right;font-weight:700} td small{display:block;font-size:6.5pt;color:#666;font-weight:400}
table.mini{font-size:7.2pt} table.mini td,table.mini th{padding:0.8mm 1mm}
table.mini td.t{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:42mm} table.mini td.c{white-space:nowrap;font-size:6.5pt}
table.mini.dense{font-size:6.4pt} table.mini.dense td,table.mini.dense th{padding:0.35mm 0.8mm} table.mini.dense .num{width:3.6mm;height:3.6mm;font-size:5.6pt} table.mini.dense .stars{letter-spacing:0.2mm}
.stars{letter-spacing:0.8mm;color:#888}
.steps{display:grid;grid-template-columns:repeat(5,1fr);gap:2.5mm;font-size:8pt}
.steps div{border:0.6pt solid #b9b9cc;border-radius:2mm;padding:2mm} .steps b{display:block;color:#4F46E5;font-size:9pt;margin-bottom:1mm}
.cols{display:flex;gap:6mm;flex:1;min-height:0;font-size:9pt;line-height:1.5}
.col{flex:1;display:flex;flex-direction:column;gap:2mm;overflow:hidden}
.col p{margin:0 0 1.5mm} .col h4,.box h4{margin:1mm 0 0.5mm;font-size:10pt;color:#3b33c4}
.hook{background:#4F46E5;color:#fff;border-radius:2mm;padding:2.5mm 3mm;font-weight:700;font-size:10pt}
.box{border-radius:2mm;padding:2mm 3mm;border:0.6pt solid #b9b9cc} .box p{margin:0.4mm 0}
.ex{background:#eef0ff;border-color:#4F46E5} .mis{background:#fff6e0;border-color:#e0a000}
.chk .q{margin-top:0.8mm;font-size:8.3pt} .ans{font-size:6.8pt;color:#999;margin-top:1mm}
.conn{color:#555} .expl{flex:1;min-height:22mm}
.lines{height:100%;min-height:15mm;background:repeating-linear-gradient(transparent,transparent 6.5mm,#c9c9d9 6.5mm,#c9c9d9 7mm)}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:6mm;height:100%} .grid4{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:4mm;height:100%}
.half,.quarter{font-size:7.6pt;line-height:1.42;overflow:hidden;display:flex;flex-direction:column;gap:1.2mm}
.half{border-left:0.6pt dashed #bbb;padding-left:4mm} .quarter{font-size:7.8pt;border:0.6pt solid #ccc;border-radius:2mm;padding:2.5mm}
.half p{margin:0 0 0.8mm} .half h4{margin:0.6mm 0 0;font-size:8.4pt;color:#3b33c4}
.ht{font-size:11pt;border-bottom:1pt solid #4F46E5;padding-bottom:1mm} .ht small{color:#777;font-size:7pt}
.hook2{font-weight:700;color:#3b33c4}
.kp div{margin-top:0.5mm} .a2{color:#666} .qa{display:flex;gap:2mm;border-bottom:0.4pt dotted #ccc} .qa span{flex:1} .qa .a2{border-right:0.6pt dashed #bbb;padding-right:2mm}
.cards{display:grid;grid-template-columns:repeat(3,1fr);grid-auto-rows:1fr;flex:1;border-top:0.6pt dashed #999;border-right:0.6pt dashed #999}
.cards.c24{grid-template-columns:repeat(4,1fr)}
.fc{border-left:0.6pt dashed #999;border-bottom:0.6pt dashed #999;display:flex;font-size:7.4pt;overflow:hidden}
.fc .q,.fc .a{flex:1;padding:1.6mm 2mm;display:flex;flex-direction:column;gap:0.8mm} .fc .q{border-left:0.6pt dotted #4F46E5}
.fc .lbl{font-size:6pt;color:#4F46E5;font-weight:800} .fc .a{color:#333;background:#fafaff}
body.bw *{background:transparent!important;color:#111!important;box-shadow:none!important}
body.bw .wh,body.bw .num,body.bw .hook{border:0.8pt solid #111}
body.bw .day,body.bw .box,body.bw .card,body.bw th,body.bw td,body.bw .quarter{border-color:#777!important}
body.bw .day.rest,body.bw .day.fri{border-style:dashed!important}
body.bw .top,body.bw .ht{border-color:#111!important}
`;
