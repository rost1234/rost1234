import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePhone, waLink, websiteKind, classifyType, placeToLead, manualLead, mergeLeads, withStatus,
  queue, snoozeUntilTomorrow, dueForCall, stats, firstMessage, demoMessage, offerMessage, followUpCallScript, prefixed,
  encodeDemo, decodeDemo, demoUrl, toCsv, parseBackup, score,
} from '../site/lib.js';

const NOW = new Date('2026-10-11T10:00:00');
const me = { name: 'דניאל', phone: '052-555-1234' };

const place = (over = {}) => ({
  id: 'p1',
  displayName: 'סטודיו פילאטיס נועה',
  formattedAddress: 'סוקולוב 10, חולון',
  internationalPhoneNumber: '+972 50-123-4567',
  nationalPhoneNumber: '050-123-4567',
  rating: 4.9,
  userRatingCount: 87,
  googleMapsURI: 'https://maps.google.com/?cid=1',
  businessStatus: 'OPERATIONAL',
  ...over,
});

test('normalizePhone handles Israeli mobile, landline, VoIP and junk', () => {
  for (const raw of ['050-123-4567', '0501234567', '+972 50-123-4567', '972501234567', '00972501234567']) {
    assert.deepEqual(normalizePhone(raw), { intl: '972501234567', local: '050-1234567', mobile: true }, raw);
  }
  assert.deepEqual(normalizePhone('03-123-4567'), { intl: '97231234567', local: '03-1234567', mobile: false });
  assert.deepEqual(normalizePhone('072-212-3456'), { intl: '972722123456', local: '072-2123456', mobile: false });
  for (const bad of ['', null, '*2700', '1-800-123-456', '050-123', 'abc']) assert.equal(normalizePhone(bad), null, String(bad));
});

test('waLink encodes the message', () => {
  assert.equal(waLink('972501234567'), 'https://wa.me/972501234567');
  assert.equal(waLink('972501234567', 'היי & שלום'), `https://wa.me/972501234567?text=${encodeURIComponent('היי & שלום')}`);
});

test('websiteKind treats social pages as no real website', () => {
  assert.equal(websiteKind(''), 'none');
  assert.equal(websiteKind('not a url'), 'none');
  assert.equal(websiteKind('https://www.instagram.com/noa.pilates/'), 'social');
  assert.equal(websiteKind('https://linktr.ee/noa'), 'social');
  assert.equal(websiteKind('https://m.facebook.com/noa'), 'social');
  assert.equal(websiteKind('https://noa-pilates.co.il'), 'site');
});

test('classifyType prefers the business name over the search it came from', () => {
  assert.equal(classifyType('Noa Pilates', 'trainer'), 'pilates');
  assert.equal(classifyType('יוגה בפארק', 'studio'), 'yoga');
  assert.equal(classifyType('CrossFit Holon', 'studio'), 'crossfit');
  assert.equal(classifyType('דני אימונים', 'trainer'), 'trainer');
  assert.equal(classifyType('Boxing Club', 'unknown'), 'studio');
});

test('placeToLead maps Google fields', () => {
  const lead = placeToLead(place(), { city: ' חולון ', searchKey: 'pilates', now: NOW });
  assert.equal(lead.id, 'p1');
  assert.equal(lead.phone, '050-1234567');
  assert.equal(lead.phoneIntl, '972501234567');
  assert.equal(lead.mobile, true);
  assert.equal(lead.city, 'חולון');
  assert.equal(lead.type, 'pilates');
  assert.equal(lead.status, 'new');
  assert.equal(lead.reviews, 87);
});

test('mergeLeads skips known ids and known phones', () => {
  const a = placeToLead(place(), { now: NOW });
  const sameId = placeToLead(place({ displayName: 'שם אחר' }), { now: NOW });
  const samePhone = placeToLead(place({ id: 'p2' }), { now: NOW });
  const fresh = placeToLead(place({ id: 'p3', internationalPhoneNumber: '+972 54-000-0000' }), { now: NOW });
  const { leads, added } = mergeLeads([a], [sameId, samePhone, fresh, fresh]);
  assert.deepEqual(added.map((l) => l.id), ['p3']);
  assert.equal(leads.length, 2);
});

test('withStatus records history and the first contact time only once', () => {
  const lead = placeToLead(place(), { now: NOW });
  const sent = withStatus(lead, 'contacted', NOW);
  assert.equal(sent.contactedAt, NOW.toISOString());
  const later = new Date(NOW.getTime() + 1000);
  const again = withStatus(withStatus(sent, 'new', later), 'contacted', later);
  assert.equal(again.contactedAt, NOW.toISOString());
  assert.equal(again.history.length, 3);
  assert.deepEqual(again.history[0], { at: NOW.toISOString(), from: 'new', to: 'contacted' });
});

test('queue puts WhatsApp-able leads without a website first and drops phoneless ones', () => {
  const withSite = placeToLead(place({ id: 'site', websiteURI: 'https://x.co.il' }), { now: NOW });
  const landline = placeToLead(place({ id: 'land', internationalPhoneNumber: '+972 3-123-4567' }), { now: NOW });
  const best = placeToLead(place({ id: 'best', internationalPhoneNumber: '+972 52-111-1111', websiteURI: 'https://instagram.com/x' }), { now: NOW });
  const noPhone = placeToLead(place({ id: 'nophone', internationalPhoneNumber: '', nationalPhoneNumber: '' }), { now: NOW });
  const done = { ...best, id: 'done', status: 'contacted' };
  assert.deepEqual(queue([withSite, landline, best, noPhone, done]).map((l) => l.id), ['best', 'land', 'site']);
  assert.ok(score(best) > score(withSite));
});

test('snoozed leads come back the next morning', () => {
  const lead = { ...placeToLead(place(), { now: NOW }), snoozeUntil: snoozeUntilTomorrow(NOW) };
  assert.equal(queue([lead], NOW).length, 0);
  assert.equal(queue([lead], new Date('2026-10-12T05:59:00')).length, 0);
  assert.equal(queue([lead], new Date('2026-10-12T06:00:00')).length, 1);
});

test('dueForCall after 4 days without an answer', () => {
  const lead = withStatus(placeToLead(place(), { now: NOW }), 'contacted', NOW);
  assert.equal(dueForCall(lead, new Date(NOW.getTime() + 3.9 * 86400000)), false);
  assert.equal(dueForCall(lead, new Date(NOW.getTime() + 4 * 86400000)), true);
  assert.equal(dueForCall({ ...lead, status: 'interested' }, new Date(NOW.getTime() + 9 * 86400000)), false);
});

test('stats counts today, statuses and revenue', () => {
  const base = placeToLead(place(), { now: NOW });
  const leads = [
    withStatus(base, 'contacted', NOW),
    { ...withStatus({ ...base, id: 'b' }, 'contacted', new Date('2026-10-01T10:00:00')) },
    { ...base, id: 'c', status: 'won', amount: '2000' },
    { ...base, id: 'd', status: 'won', amount: 1500 },
  ];
  const s = stats(leads, NOW);
  assert.equal(s.sentToday, 1);
  assert.equal(s.byStatus.contacted, 2);
  assert.equal(s.revenue, 3500);
  assert.deepEqual(s.dueCalls.map((l) => l.id), ['b']);
});

test('firstMessage is personal, asks permission, and adapts to the website situation', () => {
  const lead = placeToLead(place(), { city: 'חולון', now: NOW });
  const msg = firstMessage(lead, me);
  assert.match(msg, /ראיתי את סטודיו פילאטיס נועה בגוגל\. 4\.9 כוכבים מ-87 ביקורות/);
  assert.match(msg, /אני דניאל, ואני בונה אתרים למאמני כושר ולסטודיואים בחולון\./);
  assert.match(msg, /עדיין אין לכם אתר/);
  assert.match(msg, /רוצה שאשלח לך להציץ\?/);
  assert.doesNotMatch(msg, /https?:/, 'first message must not push a link before they agree');

  assert.match(firstMessage({ ...lead, website: 'https://instagram.com/x' }, me), /מוביל לרשת חברתית/);
  assert.match(firstMessage({ ...lead, website: 'https://x.co.il' }, me), /גרסה חדשה של האתר/);
  const plain = firstMessage({ ...lead, rating: 4.1, city: '' }, {});
  assert.doesNotMatch(plain, /כוכבים/);
  assert.match(plain, /אני \[השם שלך\]/);
  assert.match(plain, /ולסטודיואים\.$/m);
});

test('Hebrew prefixes get a hyphen before Latin names', () => {
  assert.equal(prefixed('ל', 'סטודיו'), 'לסטודיו');
  assert.equal(prefixed('ל', 'Studio Fit'), 'ל-Studio Fit');
  assert.match(demoMessage({ name: 'Studio Fit' }, 'https://x'), /שהכנתי ל-Studio Fit:\nhttps:\/\/x\n/);
});

test('offer and call scripts include prices and the lead name', () => {
  const lead = { name: 'סטודיו נועה', city: 'חולון' };
  const offer = offerMessage(lead, { site: 2500, monthly: 150 });
  assert.match(offer, /מחיר: 2,500 ₪/);
  assert.match(offer, /150 ₪ לחודש/);
  assert.match(followUpCallScript(lead, me), /זה דניאל.*לסטודיו נועה/);
});

test('demo token round-trips Hebrew and is shorter than percent-encoding', () => {
  const d = { name: 'סטודיו פילאטיס נועה', city: 'ראשון לציון', type: 'pilates', rating: '4.9', reviews: 87, by: 'דניאל', byPhone: '972525551234' };
  const token = encodeDemo(d);
  assert.match(token, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(decodeDemo(token), { ...d, rating: 4.9 });
  assert.ok(token.length < encodeURIComponent(d.name + d.city + d.by).length);
});

test('decodeDemo never throws and sanitizes values', () => {
  const empty = { name: '', city: '', type: 'studio', rating: null, reviews: 0, by: '', byPhone: '' };
  for (const bad of [undefined, '', '!!!', 'e30', encodeDemo({}).slice(1)]) assert.deepEqual(decodeDemo(bad), empty, String(bad));
  const weird = decodeDemo(encodeDemo({ name: 'x'.repeat(500), type: 'hacker', rating: 99, reviews: -3, byPhone: '03-1234567' }));
  assert.equal(weird.name.length, 80);
  assert.equal(weird.type, 'studio');
  assert.equal(weird.rating, null);
  assert.equal(weird.reviews, 0);
  assert.equal(weird.byPhone, '', 'landline cannot receive WhatsApp');
});

test('demoUrl only shows the rating when it is worth bragging about', () => {
  const lead = placeToLead(place(), { city: 'חולון', now: NOW });
  const url = demoUrl('https://rost1234.github.io/rost1234', lead, me);
  assert.ok(url.startsWith('https://rost1234.github.io/rost1234/demo/fitness/?d='));
  const d = decodeDemo(new URL(url).searchParams.get('d'));
  assert.equal(d.name, 'סטודיו פילאטיס נועה');
  assert.equal(d.rating, 4.9);
  assert.equal(d.byPhone, '972525551234');
  const meh = decodeDemo(new URL(demoUrl('https://x/', { ...lead, rating: 3.8 }, {})).searchParams.get('d'));
  assert.equal(meh.rating, null);
  assert.equal(meh.reviews, 0);
});

test('manualLead normalizes the phone and keeps unknown phones as typed', () => {
  const l = manualLead({ name: ' סטודיו ', phone: '0521112222', type: 'yoga' }, NOW, 'm1');
  assert.equal(l.name, 'סטודיו');
  assert.equal(l.phoneIntl, '972521112222');
  assert.equal(l.type, 'yoga');
  assert.equal(manualLead({ name: 'x', phone: '*1234', type: 'zzz' }, NOW, 'm2').phone, '*1234');
  assert.equal(manualLead({ name: 'x', phone: '', type: 'zzz' }, NOW, 'm3').type, 'studio');
});

test('toCsv quotes cells, translates labels and starts with a BOM', () => {
  const csv = toCsv([{ name: 'סטודיו, "נועה"', status: 'won', type: 'pilates', notes: 'שורה\nשנייה', amount: 2000 }]);
  assert.ok(csv.startsWith('﻿שם,סטטוס'));
  assert.match(csv, /"סטודיו, ""נועה""",נסגר 💰,/);
  assert.match(csv, /סטודיו פילאטיס/);
  assert.match(csv, /"שורה\nשנייה"/);
});

test('parseBackup accepts our backups and rejects anything else', () => {
  const lead = placeToLead(place(), { now: NOW });
  const ok = parseBackup(JSON.stringify({ app: 'outreach', version: 1, settings: { name: 'x' }, leads: [lead, { id: 3 }] }));
  assert.equal(ok.leads.length, 1);
  assert.equal(ok.settings.name, 'x');
  assert.throws(() => parseBackup('nope'), /לא גיבוי תקין/);
  assert.throws(() => parseBackup('{"leads":[]}'), /לא גיבוי של הכלי/);
});
