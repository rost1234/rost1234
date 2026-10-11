// Pure logic for the outreach tool and the demo site: no DOM and no storage,
// so the same file runs in the browser and under `node --test`.

export const STATUSES = [
  { key: 'new', label: 'חדש' },
  { key: 'contacted', label: 'נשלחה פנייה' },
  { key: 'interested', label: 'מעוניין' },
  { key: 'demo', label: 'קיבל דוגמה' },
  { key: 'offer', label: 'קיבל הצעת מחיר' },
  { key: 'won', label: 'נסגר 💰' },
  { key: 'noreply', label: 'לא ענה (סגור)' },
  { key: 'declined', label: 'לא מעוניין' },
  { key: 'skip', label: 'לא מתאים' },
];
export const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.key, s.label]));

// Statuses after which the business must never be messaged again.
export const CLOSED_STATUSES = new Set(['won', 'noreply', 'declined', 'skip']);

export const TYPES = {
  trainer: 'מאמן כושר אישי',
  pilates: 'סטודיו פילאטיס',
  yoga: 'סטודיו יוגה',
  crossfit: 'קרוספיט',
  studio: 'סטודיו לאימונים',
};

// One Google text search per entry, each combined with the city ("סטודיו פילאטיס חולון").
export const SEARCHES = [
  { key: 'trainer', label: 'מאמני כושר אישיים', query: 'מאמן כושר אישי' },
  { key: 'pilates', label: 'סטודיו פילאטיס', query: 'סטודיו פילאטיס' },
  { key: 'yoga', label: 'סטודיו יוגה', query: 'סטודיו יוגה' },
  { key: 'crossfit', label: 'קרוספיט', query: 'קרוספיט' },
  { key: 'studio', label: 'סטודיו אימונים', query: 'סטודיו אימונים' },
];

// Fields requested from Google (these put each search in the "Text Search Enterprise" SKU).
export const PLACE_FIELDS = [
  'id', 'displayName', 'formattedAddress', 'nationalPhoneNumber', 'internationalPhoneNumber',
  'websiteURI', 'rating', 'userRatingCount', 'googleMapsURI', 'businessStatus',
];

export const NO_REPLY_DAYS = 4;
export const DAY_MS = 24 * 60 * 60 * 1000;

// ---------- phones ----------

/**
 * Israeli phone → { intl: '972501234567', local: '050-1234567', mobile: true }, or null.
 * Mobile (05x) numbers can get WhatsApp; landlines and 07x VoIP numbers usually can't.
 */
export function normalizePhone(raw) {
  if (!raw) return null;
  let d = String(raw).replace(/\D/g, '');
  if (d.startsWith('00972')) d = d.slice(5);
  else if (d.startsWith('972')) d = d.slice(3);
  if (d.startsWith('0')) d = d.slice(1);
  if (!/^(?:[23489]\d{7}|[57]\d{8})$/.test(d)) return null;
  const areaLen = d.length === 8 ? 1 : 2;
  return {
    intl: `972${d}`,
    local: `0${d.slice(0, areaLen)}-${d.slice(areaLen)}`,
    mobile: d.startsWith('5'),
  };
}

export const waLink = (intl, text = '') =>
  `https://wa.me/${intl}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
export const telLink = (intl) => `tel:+${intl}`;

// ---------- classification ----------

const SOCIAL_HOSTS = /(^|\.)(instagram\.com|facebook\.com|fb\.me|fb\.com|linktr\.ee|tiktok\.com|wa\.me|whatsapp\.com|youtube\.com|linkin\.bio)$/i;

/** 'none' (no link), 'social' (Instagram/Facebook/Linktree… — still a great lead) or 'site'. */
export function websiteKind(url) {
  if (!url) return 'none';
  try {
    return SOCIAL_HOSTS.test(new URL(url).hostname) ? 'social' : 'site';
  } catch {
    return 'none';
  }
}

export function classifyType(name = '', searchKey = 'studio') {
  const n = name.toLowerCase();
  if (/פילאטיס|pilates|רפורמר|reformer/.test(n)) return 'pilates';
  if (/יוגה|yoga/.test(n)) return 'yoga';
  if (/קרוספיט|crossfit|cross fit/.test(n)) return 'crossfit';
  if (TYPES[searchKey]) return searchKey;
  return 'studio';
}

const hasPraise = (lead) => (lead.rating ?? 0) >= 4.5 && (lead.reviews ?? 0) >= 5;

/** Higher = contact sooner: no real website, WhatsApp-able, active on Google. */
export function score(lead) {
  return (websiteKind(lead.website) !== 'site' ? 100 : 0)
    + (lead.mobile ? 60 : 0)
    + Math.min(lead.reviews ?? 0, 100) / 2
    + (hasPraise(lead) ? 10 : 0);
}

// ---------- leads ----------

export function placeToLead(place, { city = '', searchKey = 'studio', now = new Date() } = {}) {
  const phone = normalizePhone(place.internationalPhoneNumber || place.nationalPhoneNumber);
  const name = (place.displayName || '').trim();
  return {
    id: place.id,
    source: 'google',
    name,
    phone: phone?.local ?? '',
    phoneIntl: phone?.intl ?? '',
    mobile: !!phone?.mobile,
    city: city.trim(),
    address: place.formattedAddress || '',
    type: classifyType(name, searchKey),
    website: place.websiteURI || '',
    rating: typeof place.rating === 'number' ? place.rating : null,
    reviews: place.userRatingCount ?? 0,
    mapsUrl: place.googleMapsURI || '',
    status: 'new',
    notes: '',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    history: [],
  };
}

export function manualLead({ name, phone, city = '', type = 'studio', website = '', notes = '' }, now = new Date(), id) {
  const p = normalizePhone(phone);
  return {
    id: id ?? `m_${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    source: 'manual',
    name: String(name || '').trim(),
    phone: p?.local ?? String(phone || '').trim(),
    phoneIntl: p?.intl ?? '',
    mobile: !!p?.mobile,
    city: String(city).trim(),
    address: '',
    type: TYPES[type] ? type : 'studio',
    website,
    rating: null,
    reviews: 0,
    mapsUrl: '',
    status: 'new',
    notes,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    history: [],
  };
}

/** Adds incoming leads that aren't already known (same Google id or same phone). */
export function mergeLeads(existing, incoming) {
  const ids = new Set(existing.map((l) => l.id));
  const phones = new Set(existing.map((l) => l.phoneIntl).filter(Boolean));
  const added = [];
  for (const lead of incoming) {
    if (ids.has(lead.id) || (lead.phoneIntl && phones.has(lead.phoneIntl))) continue;
    ids.add(lead.id);
    if (lead.phoneIntl) phones.add(lead.phoneIntl);
    added.push(lead);
  }
  return { leads: [...existing, ...added], added };
}

export function withStatus(lead, status, now = new Date(), extra = {}) {
  const at = now.toISOString();
  return {
    ...lead,
    ...extra,
    status,
    contactedAt: status === 'contacted' && !lead.contactedAt ? at : lead.contactedAt,
    updatedAt: at,
    history: [...(lead.history ?? []), { at, from: lead.status, to: status }],
  };
}

/** Next leads to message: new, has a phone, not put off until later, best first. */
export function queue(leads, now = new Date()) {
  return leads
    .filter((l) => l.status === 'new' && l.phoneIntl && !(l.snoozeUntil && new Date(l.snoozeUntil) > now))
    .sort((a, b) => score(b) - score(a) || a.createdAt.localeCompare(b.createdAt));
}

/** "Not now": back in the queue tomorrow morning. */
export function snoozeUntilTomorrow(now = new Date()) {
  const t = new Date(now);
  t.setDate(t.getDate() + 1);
  t.setHours(6, 0, 0, 0);
  return t.toISOString();
}

export const daysSince = (iso, now = new Date()) => Math.floor((now - new Date(iso)) / DAY_MS);

/** Contacted, no answer for NO_REPLY_DAYS → one phone call, then let it go. */
export const dueForCall = (lead, now = new Date()) =>
  lead.status === 'contacted' && !!lead.contactedAt && daysSince(lead.contactedAt, now) >= NO_REPLY_DAYS;

const sameLocalDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function stats(leads, now = new Date()) {
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s.key, 0]));
  let sentToday = 0;
  let revenue = 0;
  for (const l of leads) {
    byStatus[l.status] = (byStatus[l.status] ?? 0) + 1;
    if (l.contactedAt && sameLocalDay(new Date(l.contactedAt), now)) sentToday += 1;
    if (l.status === 'won') revenue += Number(l.amount) || 0;
  }
  return { total: leads.length, byStatus, sentToday, revenue, dueCalls: leads.filter((l) => dueForCall(l, now)) };
}

// ---------- Hebrew text ----------

const startsHebrew = (s) => /^[֐-׿]/.test(s);
/** Hebrew prefix letter (ב/ל/מ) glued to a word, with a hyphen before Latin text: "לStudio" → "ל-Studio". */
export const prefixed = (letter, word) => (startsHebrew(word) ? `${letter}${word}` : `${letter}-${word}`);
const inCity = (city) => (city ? ` ${prefixed('ב', city)}` : '');
const myName = (me) => me?.name?.trim() || '[השם שלך]';

export function firstMessage(lead, me) {
  const kind = websiteKind(lead.website);
  const idea = {
    none: 'שמתי לב שעדיין אין לכם אתר, אז הכנתי רעיון קטן בשבילכם: אתר עם קביעת אימון ניסיון ישר לוואטסאפ.',
    social: 'שמתי לב שהקישור בגוגל מוביל לרשת חברתית ולא לאתר, אז הכנתי רעיון קטן בשבילכם: אתר עם קביעת אימון ניסיון ישר לוואטסאפ.',
    site: 'הכנתי רעיון קטן לגרסה חדשה של האתר שלכם, נוחה בטלפון ועם קביעת אימון ניסיון ישר לוואטסאפ.',
  }[kind];
  return [
    'היי! 👋',
    `ראיתי את ${lead.name} בגוגל.${hasPraise(lead) ? ` ${lead.rating.toFixed(1)} כוכבים מ-${lead.reviews} ביקורות, כל הכבוד! 👏` : ''}`,
    `אני ${myName(me)}, ואני בונה אתרים למאמני כושר ולסטודיואים${inCity(lead.city)}.`,
    idea,
    'רוצה שאשלח לך להציץ? אם זה לא רלוונטי, הכל טוב ולא אכתוב שוב 🙂',
  ].join('\n');
}

export function demoMessage(lead, url) {
  return [
    `מעולה! הנה הדוגמה שהכנתי ${prefixed('ל', lead.name)}:`,
    url,
    '',
    'זו רק טעימה: באתר האמיתי יהיו התמונות, המחירים והשעות שלכם.',
    'נסו ללחוץ על "אימון ניסיון" ותראו איך לקוח קובע אצלכם אימון.',
    'אם זה מדבר אליך, נדבר 10 דקות בטלפון ואספר מה עוד אפשר.',
  ].join('\n');
}

const shekels = (n) => `${Number(n || 0).toLocaleString('en-US')} ₪`;

export function offerMessage(lead, prices) {
  return [
    'תודה על השיחה! מסכם בקצרה:',
    '',
    `🔹 אתר ${prefixed('ל', lead.name)}, נוח בטלפון: עמוד בית, אימונים, לוח שעות, מחירון ותמונות`,
    '🔹 כפתור "אימון ניסיון" שפותח וואטסאפ אליכם עם כל הפרטים',
    '🔹 חיבור לפרופיל בגוגל (כתובת, שעות וקישור לאתר)',
    '',
    `מחיר: ${shekels(prices.site)}, תשלום חד-פעמי (חצי בהתחלה, חצי במסירה)`,
    `תחזוקה ועדכונים: ${shekels(prices.monthly)} לחודש (לא חובה)`,
    'זמן עבודה: עד 7 ימים מרגע שמגיעים התמונות והתכנים',
    '',
    'נתחיל?',
  ].join('\n');
}

/** What to say on a first call (landline) — read from the screen, not sent. */
export function firstCallScript(lead, me) {
  return [
    `"היי, זה ${myName(me)}. אני בונה אתרים למאמני כושר ולסטודיואים${inCity(lead.city)}.`,
    `ראיתי את ${lead.name} בגוגל${hasPraise(lead) ? ', ויש לכם ביקורות מעולות' : ''}, והכנתי רעיון קטן לאתר בשבילכם.`,
    'אפשר לשלוח לך קישור לוואטסאפ, להציץ כשנוח?"',
    '',
    'אם אומרים לא: "תודה רבה, יום טוב!" ומסמנים "לא מעוניין".',
  ].join('\n');
}

/** One call after NO_REPLY_DAYS without an answer. Never a second message. */
export function followUpCallScript(lead, me) {
  return [
    `"היי, זה ${myName(me)}. שלחתי לכם הודעה בוואטסאפ לפני כמה ימים, על רעיון לאתר ${prefixed('ל', lead.name)}.`,
    'יש לך דקה? אשמח לשלוח לך את הדוגמה, זה חצי דקה להציץ."',
    '',
    'לא עונים? מסמנים "לא ענה (סגור)" וממשיכים הלאה. לא מתקשרים ולא כותבים שוב.',
  ].join('\n');
}

// ---------- demo link ----------
// The demo page gets everything it shows from its link, packed as base64url JSON so the
// link stays short in WhatsApp (percent-encoded Hebrew is ~3× longer).

const MAX_FIELD = 80;

function toBase64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/** { name, city, type, rating, reviews, by, byPhone } → URL-safe token. */
export function encodeDemo(d) {
  const arr = [d.name ?? '', d.city ?? '', d.type ?? '', d.rating ?? '', d.reviews ?? '', d.by ?? '', d.byPhone ?? ''];
  while (arr.length && (arr[arr.length - 1] === '' || arr[arr.length - 1] == null)) arr.pop();
  return toBase64Url(JSON.stringify(arr));
}

/** Never throws; anything malformed becomes empty fields. */
export function decodeDemo(token) {
  const empty = { name: '', city: '', type: 'studio', rating: null, reviews: 0, by: '', byPhone: '' };
  if (!token) return empty;
  let arr;
  try {
    arr = JSON.parse(fromBase64Url(String(token)));
  } catch {
    return empty;
  }
  if (!Array.isArray(arr)) return empty;
  const str = (v) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim().slice(0, MAX_FIELD) : '');
  const rating = Number(arr[3]);
  const reviews = Number(arr[4]);
  const phone = normalizePhone(str(arr[6]));
  return {
    name: str(arr[0]),
    city: str(arr[1]),
    type: TYPES[arr[2]] ? arr[2] : 'studio',
    rating: Number.isFinite(rating) && rating >= 1 && rating <= 5 ? rating : null,
    reviews: Number.isInteger(reviews) && reviews > 0 ? reviews : 0,
    by: str(arr[5]),
    byPhone: phone?.mobile ? phone.intl : '',
  };
}

export function demoUrl(base, lead, me) {
  const myPhone = normalizePhone(me?.phone);
  const token = encodeDemo({
    name: lead.name,
    city: lead.city,
    type: lead.type,
    rating: hasPraise(lead) ? lead.rating.toFixed(1) : '',
    reviews: hasPraise(lead) ? lead.reviews : '',
    by: me?.name?.trim() ?? '',
    byPhone: myPhone?.mobile ? myPhone.intl : '',
  });
  return `${base.replace(/\/?$/, '/')}demo/fitness/?d=${token}`;
}

// ---------- export ----------

const CSV_COLUMNS = [
  ['name', 'שם'], ['status', 'סטטוס'], ['phone', 'טלפון'], ['city', 'עיר'], ['type', 'סוג'],
  ['website', 'אתר'], ['rating', 'דירוג'], ['reviews', 'ביקורות'], ['contactedAt', 'תאריך פנייה'],
  ['amount', 'סכום'], ['notes', 'הערות'], ['mapsUrl', 'גוגל מפות'],
];

/** CSV with a BOM so Excel opens the Hebrew correctly. */
export function toCsv(leads) {
  const cell = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = leads.map((l) => CSV_COLUMNS.map(([k]) => {
    if (k === 'status') return cell(STATUS_LABEL[l.status] ?? l.status);
    if (k === 'type') return cell(TYPES[l.type] ?? l.type);
    return cell(l[k]);
  }).join(','));
  return `﻿${[CSV_COLUMNS.map(([, h]) => h).join(','), ...rows].join('\r\n')}`;
}

/** Validates a backup file's contents; throws a Hebrew message on bad input. */
export function parseBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('הקובץ הזה לא גיבוי תקין.');
  }
  if (!data || data.app !== 'outreach' || !Array.isArray(data.leads)) throw new Error('הקובץ הזה לא גיבוי של הכלי.');
  const leads = data.leads.filter((l) => l && typeof l.id === 'string' && typeof l.name === 'string' && STATUS_LABEL[l.status]);
  return { settings: typeof data.settings === 'object' && data.settings ? data.settings : {}, leads };
}
