import { h, icon } from './dom.js';
import {
  CLOSED_STATUSES, PLACE_FIELDS, SEARCHES, STATUSES, STATUS_LABEL, TYPES,
  daysSince, demoMessage, demoUrl, dueForCall, firstCallScript, firstMessage, followUpCallScript,
  manualLead, mergeLeads, offerMessage, parseBackup, placeToLead, prefixed, queue, snoozeUntilTomorrow,
  stats, telLink, toCsv, waLink, websiteKind, withStatus,
} from './lib.js';

const STORE_KEY = 'outreach.v1';
const USAGE_KEY = 'outreach.usage';
const DEFAULT_BASE = 'https://rost1234.github.io/rost1234/';
const GUIDE_URL = 'https://github.com/rost1234/rost1234/blob/main/outreach/README.md';
const FREE_SEARCHES_PER_MONTH = 1000;
const CITIES = ['תל אביב', 'ירושלים', 'חיפה', 'ראשון לציון', 'פתח תקווה', 'אשדוד', 'נתניה', 'באר שבע', 'חולון', 'בני ברק',
  'רמת גן', 'רחובות', 'בת ים', 'אשקלון', 'כפר סבא', 'הרצליה', 'מודיעין', 'רעננה', 'הוד השרון', 'גבעתיים', 'קריית אונו',
  'ראש העין', 'נס ציונה', 'יבנה', 'רמת השרון', 'עפולה', 'נהריה', 'קריית גת', 'אילת', 'קריות'];

// ---------- state ----------

function guessBase() {
  const u = new URL('.', location.href);
  return /^https?:$/.test(u.protocol) && !/^(localhost|127\.|0\.0\.0\.0)/.test(u.hostname) ? u.href : DEFAULT_BASE;
}

const DEFAULT_SETTINGS = { name: '', phone: '', base: guessBase(), sitePrice: 2500, monthlyPrice: 150, dailyGoal: 20, apiKey: '' };

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null');
  } catch {
    return null;
  }
}

function load() {
  const d = readJson(STORE_KEY);
  return {
    settings: { ...DEFAULT_SETTINGS, ...(d?.settings ?? {}) },
    leads: Array.isArray(d?.leads) ? d.leads : [],
  };
}

const state = load();

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    toast('לא הצלחתי לשמור בדפדפן. כדאי לייצא גיבוי מההגדרות.');
  }
}

const monthKey = () => new Date().toISOString().slice(0, 7);
const usageThisMonth = () => readJson(USAGE_KEY)?.[monthKey()] ?? 0;
function addUsage(n) {
  const all = readJson(USAGE_KEY) ?? {};
  all[monthKey()] = (all[monthKey()] ?? 0) + n;
  try {
    localStorage.setItem(USAGE_KEY, JSON.stringify(all));
  } catch { /* the counter is only informative */ }
}

const me = () => ({ name: state.settings.name, phone: state.settings.phone });
const base = () => state.settings.base || guessBase();
const findLead = (id) => state.leads.find((l) => l.id === id);
function replaceLead(lead) {
  state.leads = state.leads.map((l) => (l.id === lead.id ? lead : l));
}

/** Changes a lead, saves, re-renders and offers an undo. */
function update(lead, next, message) {
  replaceLead(next);
  save();
  toast(message ?? `${STATUS_LABEL[next.status]}: ${lead.name}`, () => {
    replaceLead(lead);
    save();
    render();
  });
  render();
}

const setStatus = (lead, status, extra) => update(lead, withStatus(lead, status, new Date(), extra),
  status === 'won' ? `🎉 נסגר! ${lead.name}: ${shekels(extra?.amount)}` : undefined);

// ---------- shell ----------

const VIEWS = {
  today: { label: 'היום', icon: 'home', render: viewToday },
  search: { label: 'חיפוש', icon: 'search', render: viewSearch },
  leads: { label: 'רשימה', icon: 'list', render: viewLeads },
  settings: { label: 'הגדרות', icon: 'sliders', render: viewSettings },
};
const currentView = () => (VIEWS[location.hash.slice(1)] ? location.hash.slice(1) : 'today');
const go = (view) => { location.hash = view; };

const main = document.getElementById('main');
const tabs = document.getElementById('tabs');
tabs.append(...Object.entries(VIEWS).map(([key, v]) =>
  h('a', { href: `#${key}`, class: 'tab', 'data-view': key }, icon(v.icon), h('span', {}, v.label))));

function render() {
  const view = currentView();
  for (const t of tabs.children) {
    if (t.dataset.view === view) t.setAttribute('aria-current', 'page');
    else t.removeAttribute('aria-current');
  }
  main.replaceChildren(VIEWS[view].render());
}

window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });

// ---------- toast ----------

const toastEl = document.getElementById('toast');
let toastTimer;
function toast(text, undo) {
  clearTimeout(toastTimer);
  toastEl.replaceChildren(h('span', {}, text));
  if (undo) toastEl.append(h('button', { type: 'button', onclick: () => { toastEl.hidden = true; undo(); } }, 'ביטול'));
  toastEl.hidden = false;
  toastTimer = setTimeout(() => { toastEl.hidden = true; }, 6000);
}

// ---------- shared bits ----------

const shekels = (n) => `${Number(n || 0).toLocaleString('en-US')} ₪`;
const card = (props, ...kids) => h('section', { ...props, class: `card ${props?.class ?? ''}` }, ...kids);
const btn = (label, onclick, cls = 'btn', iconName) => h('button', { type: 'button', class: cls, onclick }, iconName ? icon(iconName) : null, label);

function badges(lead) {
  const kind = websiteKind(lead.website);
  return h('div', { class: 'badges' },
    h('span', { class: `badge ${kind === 'site' ? '' : 'badge-good'}` },
      { none: 'אין אתר', social: 'רק רשת חברתית', site: 'יש אתר' }[kind]),
    lead.rating ? h('span', { class: 'badge' }, icon('star', 'icon icon-xs star'), `${lead.rating.toFixed(1)} (${lead.reviews})`) : null,
    lead.phoneIntl
      ? h('span', { class: `badge ${lead.mobile ? 'badge-good' : ''}` }, lead.mobile ? 'נייד: וואטסאפ' : 'קווי: רק שיחה')
      : h('span', { class: 'badge badge-warn' }, 'אין טלפון'));
}

function leadLinks(lead) {
  return h('div', { class: 'links' },
    lead.mapsUrl ? h('a', { href: lead.mapsUrl, target: '_blank', rel: 'noopener' }, icon('pin', 'icon icon-sm'), 'בגוגל מפות') : null,
    lead.website ? h('a', { href: lead.website, target: '_blank', rel: 'noopener noreferrer' }, icon('external', 'icon icon-sm'), 'הקישור שלהם') : null,
    h('a', { href: demoUrl(base(), lead, me()), target: '_blank', rel: 'noopener' }, icon('eye', 'icon icon-sm'), 'הדוגמה שלהם'));
}

/** Editable message + a WhatsApp button that always sends what's in the box. */
function composer(lead, text, label, onSent) {
  const area = h('textarea', { rows: 6, 'aria-label': label }, text);
  // Grow with the text so the whole message is visible before sending.
  const fit = () => { area.style.height = 'auto'; area.style.height = `${area.scrollHeight + 2}px`; };
  requestAnimationFrame(fit);
  const send = h('a', {
    class: 'btn btn-primary', target: '_blank', rel: 'noopener', href: waLink(lead.phoneIntl, text),
    // Re-render after the browser has started opening WhatsApp, not during the click.
    onclick: () => setTimeout(onSent, 400),
  }, icon('chat'), 'שליחה בוואטסאפ');
  area.addEventListener('input', () => { send.href = waLink(lead.phoneIntl, area.value); fit(); });
  return h('div', { class: 'composer' }, h('label', { class: 'field-label' }, label), area, send);
}

const script = (text) => h('p', { class: 'script' }, text);
const callBtn = (lead) => h('a', { class: 'btn btn-primary', href: telLink(lead.phoneIntl) }, icon('call'), `התקשרות ${lead.phone}`);

// ---------- today ----------

function onboarding() {
  const steps = [
    { done: !!state.settings.name, text: 'מוסיפים את השם והטלפון שלכם', view: 'settings' },
    { done: !!state.settings.apiKey || state.leads.length > 0, text: 'מחברים מפתח של Google Maps (או מוסיפים עסק ידנית)', view: 'search' },
    { done: state.leads.length > 0, text: 'מחפשים עסקים בעיר הראשונה', view: 'search' },
  ];
  if (steps.every((s) => s.done)) return null;
  return card({ class: 'onboarding' },
    h('h2', {}, 'שלושה צעדים ומתחילים'),
    h('ol', { class: 'checklist' }, steps.map((s) =>
      h('li', { class: s.done ? 'done' : '' },
        h('span', { class: 'tick' }, s.done ? icon('check', 'icon icon-sm') : null),
        s.done ? h('span', {}, s.text) : h('a', { href: `#${s.view}` }, s.text)))));
}

function kpis(s) {
  const goal = Number(state.settings.dailyGoal) || 20;
  const inProgress = s.byStatus.interested + s.byStatus.demo + s.byStatus.offer;
  const tile = (value, label) => h('div', { class: 'kpi' }, h('strong', {}, value), h('span', {}, label));
  return h('div', {},
    h('div', { class: 'kpis' },
      tile(`${s.sentToday}/${goal}`, 'פניות היום'),
      tile(String(s.byStatus.contacted), 'מחכים לתשובה'),
      tile(String(inProgress), 'בתהליך'),
      tile(shekels(s.revenue), `נסגרו (${s.byStatus.won})`)),
    h('div', { class: 'progress', role: 'progressbar', 'aria-label': 'התקדמות ליעד היומי', 'aria-valuemin': 0, 'aria-valuemax': goal, 'aria-valuenow': s.sentToday },
      h('span', { style: `width:${Math.min(100, (s.sentToday / goal) * 100)}%` })));
}

function nextLeadCard(lead, left) {
  const meta = [TYPES[lead.type], lead.city].filter(Boolean).join(' · ');
  const snooze = () => update(lead, { ...lead, snoozeUntil: snoozeUntilTomorrow(), updatedAt: new Date().toISOString() }, `נדחה למחר: ${lead.name}`);
  const action = lead.mobile
    ? composer(lead, firstMessage(lead, me()), 'ההודעה (אפשר לערוך לפני השליחה)', () => setStatus(findLead(lead.id) ?? lead, 'contacted'))
    : h('div', { class: 'composer' },
      h('p', { class: 'hint' }, 'מספר קווי, אין וואטסאפ. מתקשרים פעם אחת ואומרים בערך כך:'),
      script(firstCallScript(lead, me())),
      callBtn(lead),
      h('div', { class: 'row' },
        btn('מעוניין: לשלוח דוגמה', () => setStatus(lead, 'interested'), 'btn btn-soft'),
        btn('לא מעוניין', () => setStatus(lead, 'declined'), 'btn btn-soft')));
  return card({ class: 'next' },
    h('div', { class: 'card-head' },
      h('div', {}, h('p', { class: 'eyebrow' }, `הפנייה הבאה · עוד ${left} בתור`), h('h2', {}, lead.name), meta ? h('p', { class: 'muted' }, meta) : null)),
    badges(lead),
    leadLinks(lead),
    action,
    h('div', { class: 'row row-end' },
      btn('לא עכשיו (מחר)', snooze, 'btn btn-text'),
      btn('לא מתאים', () => setStatus(lead, 'skip'), 'btn btn-text')));
}

function followUpCard(lead) {
  return card({ class: 'due' },
    h('div', { class: 'card-head' }, h('div', {},
      h('h3', {}, lead.name),
      h('p', { class: 'muted' }, `נשלחה פנייה לפני ${daysSince(lead.contactedAt)} ימים ואין תשובה`))),
    h('p', { class: 'hint' }, 'שיחה אחת בלבד, בלי עוד הודעות:'),
    script(followUpCallScript(lead, me())),
    callBtn(lead),
    h('div', { class: 'row' },
      btn('ענו: מעוניינים', () => setStatus(lead, 'interested'), 'btn btn-soft'),
      btn('לא מעוניינים', () => setStatus(lead, 'declined'), 'btn btn-soft'),
      btn('לא ענו (סוגרים)', () => setStatus(lead, 'noreply'), 'btn btn-soft')));
}

function viewToday() {
  const s = stats(state.leads);
  const goal = Number(state.settings.dailyGoal) || 20;
  const q = queue(state.leads);
  const parts = [onboarding(), kpis(s)];

  if (s.dueCalls.length) {
    parts.push(h('h2', { class: 'section-title' }, icon('call'), `להתקשר היום (${s.dueCalls.length})`), ...s.dueCalls.map(followUpCard));
  }
  if (s.sentToday >= goal) {
    parts.push(card({ class: 'notice' }, h('strong', {}, 'עמדתם ביעד היומי 🎉'),
      h('p', {}, 'עדיף לא לפתוח יותר מדי שיחות חדשות ביום אחד, כדי שוואטסאפ לא יחסום את המספר. נתראה מחר!')));
  }
  if (q.length) parts.push(nextLeadCard(q[0], q.length - 1));
  else if (state.leads.length) {
    parts.push(card({ class: 'empty' }, h('h2', {}, 'אין עסקים חדשים בתור'),
      h('p', { class: 'muted' }, 'כל הכבוד! מחפשים עיר חדשה כדי להמשיך.'),
      h('a', { class: 'btn btn-primary', href: '#search' }, icon('search'), 'לחיפוש עסקים')));
  }
  const waiting = state.leads.filter((l) => ['interested', 'demo', 'offer'].includes(l.status));
  if (waiting.length) {
    parts.push(card({},
      h('h3', {}, 'בתהליך'),
      h('ul', { class: 'mini-list' }, waiting.map((l) =>
        h('li', {}, h('a', { href: `#leads`, onclick: () => { openLeadId = l.id; } }, l.name), h('span', { class: `pill pill-${l.status}` }, STATUS_LABEL[l.status]))))));
  }
  return h('div', { class: 'stack' }, parts);
}

// ---------- search ----------

let mapsLoad = null;
let authFailed = false;

function loadPlaces(key) {
  if (mapsLoad?.key === key) return mapsLoad.promise;
  if (mapsLoad) return Promise.reject(new Error('reload'));
  authFailed = false;
  const promise = new Promise((resolve, reject) => {
    window.__outreachMapsReady = () => google.maps.importLibrary('places').then(resolve, reject);
    // Google calls this global when the key is rejected (wrong key, domain not allowed, no billing).
    window.gm_authFailure = () => { authFailed = true; reject(new Error('auth')); };
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&language=he&region=IL&loading=async&callback=__outreachMapsReady`;
    s.async = true;
    s.onerror = () => reject(new Error('network'));
    document.head.append(s);
  });
  mapsLoad = { key, promise };
  promise.catch(() => { if (!authFailed) mapsLoad = null; });
  return promise;
}

function googleError(err) {
  const m = String(err?.message ?? err);
  if (m === 'reload') return 'החלפתם מפתח. רעננו את הדף ונסו שוב.';
  if (authFailed || m === 'auth') return 'גוגל דחה את המפתח. בדקו שהעתקתם אותו נכון, שהוא מורשה לכתובת של האתר הזה, ושחיוב (Billing) פעיל בפרויקט.';
  if (m === 'network') return 'אין חיבור לגוגל. בדקו את האינטרנט ונסו שוב.';
  if (/not.?activated|PERMISSION_DENIED|has not been used|disabled|API_KEY_SERVICE_BLOCKED|REQUEST_DENIED/i.test(m)) {
    return 'צריך להפעיל את Places API (New) ואת Maps JavaScript API בפרויקט שלכם ב-Google Cloud, ולוודא שהמפתח מורשה להשתמש בהם.';
  }
  return `החיפוש נכשל: ${m}`;
}

let results = null; // { city, items: Lead[], picked: Set<id> }

async function runSearch(form, statusEl, button) {
  const city = form.city.value.trim();
  const chosen = SEARCHES.filter((s) => form[`s_${s.key}`].checked);
  if (!city) { statusEl.textContent = 'כתבו עיר.'; return; }
  if (!chosen.length) { statusEl.textContent = 'בחרו לפחות סוג עסק אחד.'; return; }
  button.disabled = true;
  statusEl.classList.remove('error');
  try {
    const { Place } = await loadPlaces(state.settings.apiKey);
    const found = new Map();
    for (const [i, s] of chosen.entries()) {
      statusEl.textContent = `מחפש ${s.label} ${prefixed('ב', city)}… (${i + 1}/${chosen.length})`;
      const { places } = await Place.searchByText({
        textQuery: `${s.query} ${city}`, fields: PLACE_FIELDS, language: 'he', region: 'il', maxResultCount: 20,
      });
      addUsage(1);
      for (const p of places) {
        if (p.businessStatus && p.businessStatus !== 'OPERATIONAL') continue;
        if (!found.has(p.id)) found.set(p.id, placeToLead(p, { city, searchKey: s.key }));
      }
    }
    const items = [...found.values()];
    const { added } = mergeLeads(state.leads, items);
    const fresh = new Set(added.map((l) => l.id));
    results = {
      city,
      items: items.map((l) => ({ lead: l, known: !fresh.has(l.id) })),
      picked: new Set(added.filter((l) => l.phoneIntl && websiteKind(l.website) !== 'site').map((l) => l.id)),
    };
    statusEl.textContent = '';
    render();
  } catch (err) {
    statusEl.textContent = googleError(err);
    statusEl.classList.add('error');
  } finally {
    button.disabled = false;
  }
}

function keyCard() {
  const input = h('input', { type: 'password', autocomplete: 'off', spellcheck: 'false', placeholder: 'AIza…', 'aria-label': 'מפתח Google Maps' });
  return card({ class: 'notice' },
    h('h2', {}, icon('key'), 'מחברים את Google Maps'),
    h('p', {}, 'כדי שהכלי ימצא עסקים לבד צריך מפתח של Google Maps. לוקח בערך 10 דקות, פעם אחת. יש מכסה חינמית של בערך 1,000 חיפושים בחודש.'),
    h('a', { class: 'link', href: `${GUIDE_URL}#מפתח-google-maps`, target: '_blank', rel: 'noopener' }, icon('external', 'icon icon-sm'), 'המדריך צעד אחר צעד'),
    h('div', { class: 'row' }, input, btn('שמירה', () => {
      const v = input.value.trim();
      if (!/^[\w-]{30,}$/.test(v)) { toast('זה לא נראה כמו מפתח של גוגל. הוא מתחיל ב-AIza.'); return; }
      state.settings.apiKey = v;
      save();
      render();
    }, 'btn btn-primary')),
    h('p', { class: 'muted small' }, 'בינתיים אפשר להוסיף עסקים ידנית, למטה.'));
}

function searchForm() {
  const status = h('p', { class: 'status', role: 'status' });
  const button = h('button', { class: 'btn btn-primary', type: 'submit' }, icon('search'), 'חיפוש');
  const form = h('form', { class: 'card stack-sm', onsubmit: (e) => { e.preventDefault(); runSearch(form, status, button); } },
    h('h2', {}, 'חיפוש עסקים'),
    h('label', { class: 'field-label', for: 'city' }, 'עיר'),
    h('input', { id: 'city', name: 'city', list: 'cities', required: true, placeholder: 'למשל: חולון', value: results?.city ?? '' }),
    h('datalist', { id: 'cities' }, CITIES.map((c) => h('option', { value: c }))),
    h('fieldset', { class: 'checks' }, h('legend', { class: 'field-label' }, 'מה מחפשים'),
      SEARCHES.map((s) => h('label', { class: 'check' }, h('input', { type: 'checkbox', name: `s_${s.key}`, checked: true }), s.label))),
    button,
    status,
    h('p', { class: 'muted small' }, `החודש: ${usageThisMonth()} חיפושים מתוך כ-${FREE_SEARCHES_PER_MONTH.toLocaleString('en-US')} בחינם. כל סוג עסק הוא חיפוש אחד.`));
  return form;
}

function resultsCard() {
  if (!results) return null;
  const { items, picked } = results;
  const noSite = items.filter((i) => websiteKind(i.lead.website) !== 'site').length;
  const known = items.filter((i) => i.known).length;
  const addBtn = h('button', { class: 'btn btn-primary btn-block', type: 'button' });
  const paintAdd = () => {
    addBtn.textContent = picked.size ? `הוספת ${picked.size} עסקים לרשימה` : 'בחרו עסקים להוספה';
    addBtn.disabled = !picked.size;
  };
  addBtn.addEventListener('click', () => {
    const chosen = items.filter((i) => picked.has(i.lead.id)).map((i) => i.lead);
    const { leads, added } = mergeLeads(state.leads, chosen);
    state.leads = leads;
    save();
    results = null;
    toast(`נוספו ${added.length} עסקים. אפשר להתחיל לפנות!`);
    go('today');
  });
  paintAdd();
  const sorted = [...items].sort((a, b) => Number(a.known) - Number(b.known)
    || Number(websiteKind(a.lead.website) === 'site') - Number(websiteKind(b.lead.website) === 'site')
    || (b.lead.reviews ?? 0) - (a.lead.reviews ?? 0));
  return card({},
    h('h2', {}, `נמצאו ${items.length} עסקים ${prefixed('ב', results.city)}`),
    h('p', { class: 'muted' }, `${noSite} בלי אתר אמיתי · ${known} כבר ברשימה. סימנתי את מי שכדאי לפנות אליו.`),
    h('ul', { class: 'results' }, sorted.map(({ lead, known: isKnown }) => {
      const box = h('input', { type: 'checkbox', checked: picked.has(lead.id), disabled: isKnown, 'aria-label': lead.name });
      box.addEventListener('change', () => { if (box.checked) picked.add(lead.id); else picked.delete(lead.id); paintAdd(); });
      return h('li', { class: isKnown ? 'known' : '' },
        h('label', { class: 'result' }, box,
          h('span', { class: 'result-main' },
            h('strong', {}, lead.name),
            h('span', { class: 'muted small' }, isKnown ? 'כבר ברשימה' : [TYPES[lead.type], lead.address].filter(Boolean).join(' · ')),
            badges(lead))));
    })),
    h('div', { class: 'sticky-action' }, addBtn));
}

function manualCard() {
  const form = h('form', { class: 'stack-sm', onsubmit: (e) => {
    e.preventDefault();
    const f = e.target;
    const lead = manualLead({ name: f.mname.value, phone: f.mphone.value, city: f.mcity.value, type: f.mtype.value, website: f.msite.value.trim() });
    if (!lead.name) { toast('צריך שם של עסק.'); return; }
    const { leads, added } = mergeLeads(state.leads, [lead]);
    if (!added.length) { toast('העסק הזה (או המספר הזה) כבר ברשימה.'); return; }
    state.leads = leads;
    save();
    toast(`נוסף: ${lead.name}`);
    f.reset();
  } },
  h('label', { class: 'field-label', for: 'mname' }, 'שם העסק'), h('input', { id: 'mname', name: 'mname', required: true }),
  h('label', { class: 'field-label', for: 'mphone' }, 'טלפון'), h('input', { id: 'mphone', name: 'mphone', type: 'tel', inputmode: 'tel', placeholder: '050-1234567' }),
  h('label', { class: 'field-label', for: 'mcity' }, 'עיר'), h('input', { id: 'mcity', name: 'mcity', list: 'cities' }),
  h('label', { class: 'field-label', for: 'mtype' }, 'סוג'), h('select', { id: 'mtype', name: 'mtype' }, Object.entries(TYPES).map(([k, v]) => h('option', { value: k }, v))),
  h('label', { class: 'field-label', for: 'msite' }, 'קישור לאתר או לאינסטגרם (אם יש)'), h('input', { id: 'msite', name: 'msite', type: 'url', inputmode: 'url', placeholder: 'https://instagram.com/…' }),
  h('button', { class: 'btn btn-soft', type: 'submit' }, icon('plus'), 'הוספה'));
  return h('details', { class: 'card', open: !state.settings.apiKey && !state.leads.length },
    h('summary', {}, h('h2', {}, 'הוספה ידנית')),
    h('p', { class: 'muted small' }, 'מצאתם עסק בגוגל מפות, באינסטגרם או בשכונה? מוסיפים אותו כאן.'),
    form);
}

function viewSearch() {
  return h('div', { class: 'stack' }, state.settings.apiKey ? searchForm() : keyCard(), resultsCard(), manualCard());
}

// ---------- leads list ----------

let filter = 'active';
let textFilter = '';
let openLeadId = null;

const FILTERS = [
  { key: 'active', label: 'פעילים', test: (l) => !CLOSED_STATUSES.has(l.status) },
  ...STATUSES.map((s) => ({ key: s.key, label: s.label, test: (l) => l.status === s.key })),
  { key: 'all', label: 'הכל', test: () => true },
];

function statusPanel(lead) {
  const prices = { site: state.settings.sitePrice, monthly: state.settings.monthlyPrice };
  const soft = (label, status) => btn(label, () => setStatus(lead, status), 'btn btn-soft');
  switch (lead.status) {
    case 'new':
      return lead.mobile
        ? composer(lead, firstMessage(lead, me()), 'פנייה ראשונה', () => setStatus(findLead(lead.id) ?? lead, 'contacted'))
        : h('div', { class: 'composer' }, script(firstCallScript(lead, me())), lead.phoneIntl ? callBtn(lead) : null,
          h('div', { class: 'row' }, soft('מעוניין', 'interested'), soft('לא מעוניין', 'declined')));
    case 'contacted':
      return h('div', { class: 'composer' },
        dueForCall(lead) ? [h('p', { class: 'hint' }, 'עברו 4 ימים בלי תשובה. שיחה אחת:'), script(followUpCallScript(lead, me())), callBtn(lead)] : h('p', { class: 'hint' }, 'מה ענו?'),
        h('div', { class: 'row' }, soft('ענו: מעוניינים', 'interested'), soft('לא מעוניינים', 'declined'),
          dueForCall(lead) ? soft('לא ענו (סוגרים)', 'noreply') : null));
    case 'interested':
      return lead.phoneIntl && lead.mobile
        ? composer(lead, demoMessage(lead, demoUrl(base(), lead, me())), 'שולחים את הדוגמה', () => setStatus(findLead(lead.id) ?? lead, 'demo'))
        : h('div', { class: 'composer' }, h('p', { class: 'hint' }, 'אין וואטסאפ. מעתיקים את הקישור לדוגמה ושולחים במייל או ב-SMS אחרי שהסכימו:'),
          script(demoUrl(base(), lead, me())), soft('שלחתי את הדוגמה', 'demo'));
    case 'demo':
      return h('div', { class: 'composer' },
        h('p', { class: 'hint' }, 'אחרי שיחה קצרה שולחים הצעת מחיר:'),
        lead.mobile ? composer(lead, offerMessage(lead, prices), 'הצעת מחיר', () => setStatus(findLead(lead.id) ?? lead, 'offer')) : script(offerMessage(lead, prices)),
        h('div', { class: 'row' }, lead.mobile ? null : soft('שלחתי הצעה', 'offer'), soft('לא מעוניינים', 'declined')));
    case 'offer': {
      const amount = h('input', { type: 'number', inputmode: 'numeric', min: 0, step: 50, value: lead.amount ?? state.settings.sitePrice, 'aria-label': 'סכום העסקה' });
      return h('div', { class: 'composer' },
        h('label', { class: 'field-label' }, 'סכום העסקה (₪)'), amount,
        h('div', { class: 'row' },
          btn('נסגר! 🎉', () => setStatus(lead, 'won', { amount: Number(amount.value) || 0 }), 'btn btn-primary'),
          soft('לא מעוניינים', 'declined')));
    }
    case 'won':
      return h('p', { class: 'win' }, `נסגר ב-${shekels(lead.amount)}. כל הכבוד! 💪`);
    case 'skip':
      return h('div', { class: 'composer' }, h('p', { class: 'hint' }, 'סימנתם שהעסק לא מתאים.'), soft('החזרה לתור', 'new'));
    default:
      return h('p', { class: 'hint' }, '✋ לא פונים לעסק הזה שוב.');
  }
}

function leadItem(lead) {
  const notes = h('textarea', { rows: 2, placeholder: 'הערות: עם מי דיברתי, מה חשוב להם…', 'aria-label': 'הערות' }, lead.notes ?? '');
  notes.addEventListener('change', () => {
    replaceLead({ ...findLead(lead.id), notes: notes.value, updatedAt: new Date().toISOString() });
    save();
    toast('ההערה נשמרה');
  });
  const type = h('select', { 'aria-label': 'סוג העסק (משנה את עיצוב הדוגמה)' },
    Object.entries(TYPES).map(([k, v]) => h('option', { value: k, selected: k === lead.type }, v)));
  type.addEventListener('change', () => update(lead, { ...lead, type: type.value }, 'סוג העסק עודכן'));
  const remove = btn('מחיקה', () => {
    if (!confirm(`למחוק את ${lead.name}? אם רק לא מעוניינים, עדיף לסמן "לא מעוניין" כדי לא לפנות שוב בטעות.`)) return;
    state.leads = state.leads.filter((l) => l.id !== lead.id);
    save();
    toast(`נמחק: ${lead.name}`, () => { state.leads.push(lead); save(); render(); });
    render();
  }, 'btn btn-text danger', 'trash');

  const item = h('details', { class: 'lead', open: openLeadId === lead.id },
    h('summary', {},
      h('span', { class: 'lead-name' }, lead.name),
      h('span', { class: `pill pill-${lead.status}` }, STATUS_LABEL[lead.status]),
      h('span', { class: 'muted small lead-meta' }, [TYPES[lead.type], lead.city, lead.phone].filter(Boolean).join(' · '))),
    h('div', { class: 'lead-body' },
      badges(lead),
      leadLinks(lead),
      statusPanel(lead),
      h('label', { class: 'field-label' }, 'הערות'), notes,
      h('div', { class: 'row row-between' }, type, remove),
      lead.history?.length
        ? h('p', { class: 'muted small' }, lead.history.slice(-3).map((e) =>
          `${new Date(e.at).toLocaleDateString('he-IL')}: ${STATUS_LABEL[e.to]}`).join(' ← '))
        : null));
  item.addEventListener('toggle', () => { if (item.open) openLeadId = lead.id; else if (openLeadId === lead.id) openLeadId = null; });
  return item;
}

function viewLeads() {
  if (!state.leads.length) {
    return card({ class: 'empty' }, h('h2', {}, 'הרשימה ריקה'), h('p', { class: 'muted' }, 'מתחילים בחיפוש עסקים.'),
      h('a', { class: 'btn btn-primary', href: '#search' }, icon('search'), 'לחיפוש'));
  }
  const counts = Object.fromEntries(FILTERS.map((f) => [f.key, state.leads.filter(f.test).length]));
  const active = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const q = textFilter.trim();
  const list = state.leads
    .filter(active.test)
    .filter((l) => !q || [l.name, l.city, l.phone, l.notes].some((v) => v?.includes(q)))
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
  const listEl = h('div', { class: 'leads' }, list.length ? list.map(leadItem) : h('p', { class: 'muted center' }, 'אין כאן עסקים.'));
  const search = h('input', { type: 'search', placeholder: 'חיפוש לפי שם, עיר או טלפון', value: textFilter, 'aria-label': 'חיפוש ברשימה' });
  search.addEventListener('input', () => {
    textFilter = search.value;
    const pos = search.selectionStart;
    render();
    const again = main.querySelector('input[type=search]');
    again.focus();
    again.setSelectionRange(pos, pos);
  });
  return h('div', { class: 'stack' },
    h('div', { class: 'filters', role: 'tablist', 'aria-label': 'סינון' }, FILTERS.filter((f) => counts[f.key] || f.key === filter || f.key === 'active').map((f) =>
      h('button', { type: 'button', class: 'chip', role: 'tab', 'aria-selected': String(f.key === filter), onclick: () => { filter = f.key; render(); } },
        `${f.label} (${counts[f.key]})`))),
    search,
    listEl);
}

// ---------- settings ----------

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = h('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function viewSettings() {
  const s = state.settings;
  const field = (key, label, props = {}) => {
    const input = h('input', { id: `set-${key}`, value: s[key] ?? '', ...props });
    input.addEventListener('change', () => {
      const v = props.type === 'number' ? Number(input.value) || 0 : input.value.trim();
      state.settings[key] = v;
      save();
      toast('נשמר');
    });
    return [h('label', { class: 'field-label', for: `set-${key}` }, label), input];
  };
  const fileInput = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      const data = parseBackup(await file.text());
      const { leads, added } = mergeLeads(state.leads, data.leads);
      if (!confirm(`לייבא ${added.length} עסקים מהגיבוי? (עסקים שכבר ברשימה לא ישתנו)`)) return;
      state.leads = leads;
      const { apiKey, ...rest } = data.settings;
      state.settings = { ...state.settings, ...rest };
      save();
      toast(`יובאו ${added.length} עסקים`);
      render();
    } catch (err) {
      toast(err.message);
    } finally {
      fileInput.value = '';
    }
  });
  const stamp = () => new Date().toISOString().slice(0, 10);
  const keyInput = h('input', { id: 'set-apiKey', type: 'password', autocomplete: 'off', spellcheck: 'false', value: s.apiKey, placeholder: 'AIza…' });
  keyInput.addEventListener('change', () => {
    state.settings.apiKey = keyInput.value.trim();
    save();
    toast(mapsLoad ? 'נשמר. רעננו את הדף כדי להשתמש במפתח החדש.' : 'נשמר');
  });

  return h('div', { class: 'stack' },
    card({ class: 'stack-sm' },
      h('h2', {}, 'עליכם'),
      h('p', { class: 'muted small' }, 'השם מופיע בהודעות ובאתר הדוגמה. הטלפון מאפשר לבעל העסק לכתוב לכם ישר מהדוגמה.'),
      field('name', 'השם שלכם', { autocomplete: 'given-name', placeholder: 'למשל: דניאל' }),
      field('phone', 'הנייד שלכם', { type: 'tel', inputmode: 'tel', autocomplete: 'tel', placeholder: '050-1234567' })),
    card({ class: 'stack-sm' },
      h('h2', {}, 'מחירים ויעדים'),
      field('sitePrice', 'מחיר אתר (₪)', { type: 'number', inputmode: 'numeric', min: 0, step: 100 }),
      field('monthlyPrice', 'תחזוקה חודשית (₪)', { type: 'number', inputmode: 'numeric', min: 0, step: 10 }),
      field('dailyGoal', 'יעד פניות ביום', { type: 'number', inputmode: 'numeric', min: 1, max: 50 }),
      h('p', { class: 'muted small' }, 'מומלץ עד 20 שיחות חדשות ביום, כדי שוואטסאפ לא יחסום את המספר.')),
    card({ class: 'stack-sm' },
      h('h2', {}, 'Google Maps'),
      h('label', { class: 'field-label', for: 'set-apiKey' }, 'מפתח API'), keyInput,
      h('a', { class: 'link', href: `${GUIDE_URL}#מפתח-google-maps`, target: '_blank', rel: 'noopener' }, icon('external', 'icon icon-sm'), 'איך משיגים מפתח'),
      field('base', 'כתובת האתר שלכם (לקישורי הדוגמה)', { type: 'url', inputmode: 'url', dir: 'ltr' })),
    card({ class: 'stack-sm' },
      h('h2', {}, 'גיבוי'),
      h('p', { class: 'muted small' }, 'הכל נשמר רק בדפדפן הזה. כדאי לייצא גיבוי פעם בשבוע (המפתח של גוגל לא נכלל בגיבוי).'),
      h('div', { class: 'row' },
        btn('ייצוא גיבוי', () => {
          const { apiKey, ...settings } = state.settings;
          download(`leads-backup-${stamp()}.json`, JSON.stringify({ app: 'outreach', version: 1, exportedAt: new Date().toISOString(), settings, leads: state.leads }, null, 2), 'application/json');
        }, 'btn btn-soft', 'download'),
        btn('ייבוא גיבוי', () => fileInput.click(), 'btn btn-soft', 'upload'),
        btn('ייצוא לאקסל', () => download(`leads-${stamp()}.csv`, toCsv(state.leads), 'text/csv;charset=utf-8'), 'btn btn-soft', 'download')),
      fileInput,
      btn('מחיקת כל הנתונים', () => {
        if (!confirm('למחוק את כל העסקים וההגדרות מהדפדפן? אי אפשר לבטל את זה.')) return;
        state.leads = [];
        state.settings = { ...DEFAULT_SETTINGS };
        save();
        render();
      }, 'btn btn-text danger', 'trash')));
}

render();
