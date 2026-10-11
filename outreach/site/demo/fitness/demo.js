// Renders the demo from its link (?d=…). Every value from the link goes in through
// textContent, never as HTML, because anyone can craft a link.
import { h, icon } from '../../dom.js';
import { decodeDemo, prefixed, TYPES, waLink } from '../../lib.js';
import { CONTENT, GOALS, WEEK } from './content.js';

const params = new URLSearchParams(location.search);
const d = decodeDemo(params.get('d'));
if (TYPES[params.get('t')]) d.type = params.get('t'); // ?t=yoga previews another style
const c = CONTENT[d.type];
const name = d.name || c.fallbackName;
const personal = !!d.name;

document.documentElement.dataset.theme = c.theme;
document.documentElement.style.setProperty('--accent', c.accent);
document.title = personal ? `${name} · ${c.kicker}` : `דוגמה לאתר · ${c.kicker}`;

// ---------- dialog: shows the business what their customers' tap would do ----------

const dialog = h('dialog', { class: 'sheet', 'aria-labelledby': 'sheet-title' });
document.body.append(dialog);
dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

function ownerCta() {
  if (!d.byPhone) return null;
  const who = d.by ? prefixed('ל', d.by) : 'אליי';
  const text = `היי${d.by ? ` ${d.by}` : ''}, ראיתי את הדוגמה לאתר של ${name} ואשמח לשמוע עוד`;
  return h('a', { class: 'btn btn-accent btn-block', href: waLink(d.byPhone, text), target: '_blank', rel: 'noopener' },
    icon('chat'), `רוצים אתר כזה? כתבו ${who}`);
}

function showSheet({ title, bubble, note }) {
  const initial = [...name][0] ?? '•';
  const cta = ownerCta();
  dialog.replaceChildren(
    h('div', { class: 'sheet-head' },
      h('h3', { id: 'sheet-title' }, title),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'סגירה', onclick: () => dialog.close() }, icon('x'))),
    h('div', { class: 'chat-mock' },
      h('div', { class: 'chat-top' }, h('span', { class: 'avatar' }, initial), h('div', {}, h('strong', {}, name), h('small', {}, 'וואטסאפ'))),
      h('div', { class: 'chat-body' }, h('p', { class: 'bubble' }, bubble, h('span', { class: 'bubble-time' }, timeNow(), ' ✓✓')))),
    h('p', { class: 'sheet-note' }, note),
  );
  if (cta) dialog.append(cta);
  dialog.showModal();
}

const timeNow = () => new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

const contactSheet = () => showSheet({
  title: 'ככה זה עובד אצלכם',
  bubble: `היי ${name}! ראיתי את האתר ואשמח לשמוע פרטים 🙂`,
  note: 'בגרסה האמיתית הכפתור פותח וואטסאפ ישר אליכם. לקוח שמגיע מגוגל כותב לכם בלחיצה אחת.',
});

// ---------- sections ----------

function ribbon() {
  const cta = d.byPhone ? h('button', { class: 'ribbon-btn', type: 'button', onclick: contactSheet }, 'רוצים אותו?') : null;
  return h('div', { class: 'ribbon' },
    icon('sparkle', 'icon icon-sm'),
    h('span', {}, personal ? `דוגמה שהוכנה במיוחד עבור ${name}` : 'דוגמה לאתר לסטודיו כושר'),
    cta);
}

function header() {
  const hasSchedule = !!c.schedule;
  return h('header', { class: 'site-head' },
    h('div', { class: 'wrap head-row' },
      h('a', { class: 'logo', href: '#top' }, h('span', { class: 'logo-mark' }, icon(c.icon)), h('span', { class: 'logo-name' }, name)),
      h('nav', { class: 'nav', 'aria-label': 'ניווט' },
        h('a', { href: '#services' }, 'אימונים'),
        h('a', { href: hasSchedule ? '#schedule' : '#steps' }, hasSchedule ? 'לוח שעות' : 'איך זה עובד'),
        h('a', { href: '#pricing' }, 'מחירים'),
        h('a', { href: '#faq' }, 'שאלות')),
      h('a', { class: 'btn btn-accent btn-sm', href: '#book' }, 'אימון ניסיון')));
}

function hero() {
  const kicker = d.city ? `${c.kicker} ${prefixed('ב', d.city)}` : c.kicker;
  const rating = d.rating
    ? h('div', { class: 'rating' }, h('span', { class: 'stars' }, icon('star', 'icon icon-sm')), h('strong', {}, d.rating.toFixed(1)),
      h('span', {}, `· ${d.reviews} ביקורות בגוגל`))
    : null;
  return h('section', { class: 'hero', id: 'top' },
    h('div', { class: 'wrap hero-grid' },
      h('div', { class: 'hero-copy' },
        h('p', { class: 'kicker' }, kicker),
        h('h1', {}, c.title),
        h('p', { class: 'hero-lead' }, c.lead),
        h('div', { class: 'hero-ctas' },
          h('a', { class: 'btn btn-accent', href: '#book' }, icon('calendar'), 'לקביעת אימון ניסיון'),
          h('button', { class: 'btn btn-ghost', type: 'button', onclick: contactSheet }, icon('chat'), 'וואטסאפ')),
        rating,
        h('ul', { class: 'perks' }, c.perks.map((p) => h('li', {}, icon('check', 'icon icon-sm'), p)))),
      h('div', { class: 'hero-art', 'aria-hidden': 'true' },
        h('div', { class: 'art-ring art-ring-1' }), h('div', { class: 'art-ring art-ring-2' }),
        h('div', { class: 'art-tile' }, icon(c.icon, 'icon art-icon')),
        h('div', { class: 'art-chip art-chip-1' }, icon('clock', 'icon icon-sm'), 'אימון הבא היום'),
        h('div', { class: 'art-chip art-chip-2' }, icon('camera', 'icon icon-sm'), 'כאן תופיע תמונה שלכם'))));
}

const sectionHead = (eyebrow, title, sub) =>
  h('div', { class: 'section-head' }, h('p', { class: 'eyebrow' }, eyebrow), h('h2', {}, title), sub ? h('p', { class: 'section-sub' }, sub) : null);

function services() {
  return h('section', { class: 'section', id: 'services' },
    h('div', { class: 'wrap' },
      sectionHead('מה עושים כאן', c.servicesTitle),
      h('div', { class: 'cards' }, c.services.map((s) =>
        h('article', { class: 'card' }, h('span', { class: 'card-icon' }, icon(s.icon)), h('h3', {}, s.title), h('p', {}, s.text))))));
}

function scheduleSection() {
  const today = new Date().getDay(); // 0 = Sunday = א׳
  let current = today < WEEK.length ? today : 0;
  const list = h('ul', { class: 'classes' });
  const tabs = c.schedule.map((day, i) => h('button', {
    class: 'day', type: 'button', role: 'tab', onclick: () => { current = i; paint(); },
  }, day.day));
  function paint() {
    tabs.forEach((t, i) => t.setAttribute('aria-selected', String(i === current)));
    list.replaceChildren(...c.schedule[current].items.map((it) =>
      h('li', {}, h('span', { class: 'class-time' }, icon('clock', 'icon icon-sm'), it.time), h('span', { class: 'class-name' }, it.name),
        h('a', { class: 'class-book', href: '#book', onclick: () => preselect(c.schedule[current].day, it.time) }, 'לשריון'))));
  }
  paint();
  return h('section', { class: 'section section-alt', id: 'schedule' },
    h('div', { class: 'wrap' },
      sectionHead('לוח שעות', 'מתי מתאמנים', 'לוח לדוגמה. באתר שלכם יופיעו השעות האמיתיות, ואפשר לעדכן אותן בקלות.'),
      h('div', { class: 'schedule' }, h('div', { class: 'days', role: 'tablist', 'aria-label': 'ימים' }, tabs), list)));
}

function stepsSection() {
  return h('section', { class: 'section section-alt', id: 'steps' },
    h('div', { class: 'wrap' },
      sectionHead('איך מתחילים', 'ארבעה צעדים ואתם בפנים'),
      h('ol', { class: 'steps' }, c.steps.map((s, i) =>
        h('li', { class: 'step' }, h('span', { class: 'step-num' }, String(i + 1)), h('h3', {}, s.title), h('p', {}, s.text))))));
}

function gallery() {
  const tiles = ['האימונים', 'הסטודיו', 'המתאמנים', 'רגעים מהאינסטגרם'];
  return h('section', { class: 'section' },
    h('div', { class: 'wrap' },
      sectionHead('גלריה', 'ככה זה נראה אצלנו', 'כאן ייכנסו התמונות והסרטונים שלכם, ישר מהאינסטגרם.'),
      h('div', { class: 'gallery' }, tiles.map((t, i) =>
        h('figure', { class: `tile tile-${i + 1}` }, icon('camera', 'icon'), h('figcaption', {}, t))))));
}

function pricing() {
  return h('section', { class: 'section section-alt', id: 'pricing' },
    h('div', { class: 'wrap' },
      sectionHead('מחירים', 'בוחרים מה שמתאים לך', 'המחירים כאן לדוגמה. באתר שלכם יופיעו המחירים שלכם.'),
      h('div', { class: 'plans' }, c.plans.map((p) =>
        h('article', { class: `plan${p.featured ? ' plan-featured' : ''}` },
          p.featured ? h('span', { class: 'plan-badge' }, 'הכי משתלם') : null,
          h('h3', {}, p.name),
          h('p', { class: 'price' }, h('strong', {}, `${p.price} ₪`), h('span', {}, p.unit)),
          h('ul', {}, p.features.map((f) => h('li', {}, icon('check', 'icon icon-sm'), f))),
          h('a', { class: `btn ${p.featured ? 'btn-accent' : 'btn-ghost'} btn-block`, href: '#book' }, 'מתחילים'))))));
}

// ---------- booking ----------

const form = { day: null, time: null };
let preselect = () => {};

function booking() {
  const nameInput = h('input', { id: 'b-name', name: 'name', autocomplete: 'given-name', required: true, maxlength: 40, placeholder: 'איך קוראים לך?' });
  const goal = h('select', { id: 'b-goal', name: 'goal' }, h('option', { value: '' }, 'לא חובה'), GOALS.map((g) => h('option', {}, g)));
  const chips = (values, key, label) => {
    const group = h('div', { class: 'chips', role: 'radiogroup', 'aria-label': label });
    const buttons = values.map((v) => h('button', {
      class: 'chip', type: 'button', role: 'radio', 'aria-checked': 'false',
      onclick: () => select(v),
    }, v));
    function select(v) {
      form[key] = v;
      buttons.forEach((b) => b.setAttribute('aria-checked', String(b.textContent === v)));
    }
    group.append(...buttons);
    return { group, select };
  };
  const days = chips(WEEK, 'day', 'יום');
  const times = chips(['בוקר', 'צהריים', 'ערב'], 'time', 'שעה');
  preselect = (day, time) => {
    days.select(day);
    const hour = Number(time.slice(0, 2));
    times.select(hour < 12 ? 'בוקר' : hour < 16 ? 'צהריים' : 'ערב');
  };
  const error = h('p', { class: 'form-error', role: 'alert' });

  const onSubmit = (e) => {
    e.preventDefault();
    const who = nameInput.value.trim();
    if (!who || !form.day || !form.time) {
      error.textContent = !who ? 'רק צריך שם 🙂' : 'בחרו יום ושעה שנוחים לכם';
      return;
    }
    error.textContent = '';
    const lines = [`היי ${name}! 👋`, `אני ${who}, אשמח לקבוע אימון ניסיון.`, `יום ${form.day}, ${form.time}`];
    if (goal.value) lines.push(`המטרה שלי: ${goal.value}`);
    showSheet({
      title: 'ככה לקוח קובע אצלכם אימון',
      bubble: lines.join('\n'),
      note: 'בגרסה האמיתית הכפתור פותח וואטסאפ ישר אליכם עם ההודעה הזו. בלי טפסים שהולכים לאיבוד ובלי לפספס אף פנייה.',
    });
  };

  return h('section', { class: 'section', id: 'book' },
    h('div', { class: 'wrap book-grid' },
      h('div', {},
        sectionHead('אימון ניסיון', 'בואו נכיר', 'משאירים שם, בוחרים מתי נוח, וחוזרים אליכם בוואטסאפ.'),
        h('ul', { class: 'book-points' },
          h('li', {}, icon('check', 'icon icon-sm'), 'בלי התחייבות'),
          h('li', {}, icon('check', 'icon icon-sm'), 'מתאים לכל רמה'),
          h('li', {}, icon('check', 'icon icon-sm'), 'תשובה מהירה בוואטסאפ'))),
      h('form', { class: 'book-form', novalidate: true, onsubmit: onSubmit },
        h('label', { for: 'b-name' }, 'שם'), nameInput,
        h('span', { class: 'label' }, 'איזה יום?'), days.group,
        h('span', { class: 'label' }, 'מתי ביום?'), times.group,
        h('label', { for: 'b-goal' }, 'מה המטרה?'), goal,
        error,
        h('button', { class: 'btn btn-accent btn-block', type: 'submit' }, icon('chat'), 'שליחה בוואטסאפ'))));
}

function faqSection() {
  return h('section', { class: 'section section-alt', id: 'faq' },
    h('div', { class: 'wrap narrow' },
      sectionHead('שאלות', 'שאלות נפוצות'),
      h('div', { class: 'faq' }, c.faq.map((f) => h('details', {}, h('summary', {}, f.q), h('p', {}, f.a))))));
}

function footer() {
  return h('footer', { class: 'site-foot' },
    h('div', { class: 'wrap foot-grid' },
      h('div', {},
        h('a', { class: 'logo', href: '#top' }, h('span', { class: 'logo-mark' }, icon(c.icon)), h('span', { class: 'logo-name' }, name)),
        d.city ? h('p', { class: 'foot-line' }, icon('pin', 'icon icon-sm'), d.city) : null),
      h('div', { class: 'foot-actions' },
        h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: contactSheet }, icon('chat'), 'וואטסאפ'),
        h('a', { class: 'btn btn-accent btn-sm', href: '#book' }, 'אימון ניסיון'))),
    h('div', { class: 'wrap foot-credit' },
      h('span', {}, `© ${new Date().getFullYear()} ${name}`),
      h('span', {}, d.by ? `דוגמה שנבנתה על ידי ${d.by}` : 'דוגמה לאתר')));
}

function mobileBar() {
  return h('div', { class: 'mobile-bar' },
    h('a', { class: 'btn btn-accent', href: '#book' }, 'אימון ניסיון'),
    h('button', { class: 'btn btn-ghost', type: 'button', onclick: contactSheet, 'aria-label': 'וואטסאפ' }, icon('chat')));
}

document.getElementById('app').replaceChildren(
  ribbon(), header(),
  h('main', {}, hero(), services(), c.schedule ? scheduleSection() : stepsSection(), gallery(), pricing(), booking(), faqSection()),
  footer(), mobileBar(),
);
