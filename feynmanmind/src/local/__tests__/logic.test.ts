import {
  addCards,
  addSession,
  computeStats,
  dayKey,
  deleteSubject,
  dueCards,
  fromBackup,
  reviewCard,
  saveConcept,
  saveSubject,
  toBackup,
  updateCard,
} from '../logic';
import { DuplicateError, emptyDB, type LocalDB } from '../types';

let n = 0;
const newId = () => `id${++n}`;
const NOW = new Date(2026, 8, 24, 10, 0, 0); // local time

const evaluation = {
  comprehension_score: 64,
  mastery_verdict: 'developing' as const,
  jargon_detected: [],
  misconceptions: [],
  primary_gap: 'gap',
  socratic_question: 'Why?',
  encouragement: '',
};

function seed(): { db: LocalDB; subjectId: string; conceptId: string } {
  let db = emptyDB();
  let subjectId: string, conceptId: string;
  [db, subjectId] = saveSubject(db, { title: 'Biology' }, newId, NOW);
  [db, conceptId] = saveConcept(db, { subjectId, title: 'Photosynthesis' }, newId, NOW);
  return { db, subjectId, conceptId };
}

describe('subjects and concepts', () => {
  it('rejects duplicate titles case-insensitively, but allows renaming to itself', () => {
    const { db, subjectId } = seed();
    expect(() => saveSubject(db, { title: '  biology ' }, newId, NOW)).toThrow(DuplicateError);
    expect(() => saveSubject(db, { id: subjectId, title: 'BIOLOGY' }, newId, NOW)).not.toThrow();
  });

  it('allows the same concept title in different subjects', () => {
    let { db } = seed();
    let other: string;
    [db, other] = saveSubject(db, { title: 'Chemistry' }, newId, NOW);
    expect(() => saveConcept(db, { subjectId: other, title: 'Photosynthesis' }, newId, NOW)).not.toThrow();
  });

  it('deleting a subject cascades to its concepts, cards and sessions', () => {
    let { db, subjectId, conceptId } = seed();
    [db] = addCards(db, conceptId, [{ question: 'Q?', answer: 'A' }], newId, NOW);
    [db] = addSession(db, conceptId, 'explanation', evaluation, newId, NOW);
    db = deleteSubject(db, subjectId);
    expect([db.subjects, db.concepts, db.cards, db.sessions].map((r) => Object.keys(r).length)).toEqual([0, 0, 0, 0]);
  });
});

describe('flashcards', () => {
  it('skips duplicate and empty questions when adding', () => {
    let { db, conceptId } = seed();
    let added;
    [db, added] = addCards(db, conceptId, [{ question: 'What is ATP?', answer: 'Energy' }], newId, NOW);
    [db, added] = addCards(
      db,
      conceptId,
      [
        { question: 'what is atp', answer: 'dupe' },
        { question: '  ', answer: 'empty' },
        { question: 'Where?', answer: 'Chloroplast' },
      ],
      newId,
      NOW,
    );
    expect(added.map((c) => c.question)).toEqual(['Where?']);
    expect(() => updateCard(db, added[0]!.id, { question: 'WHAT IS ATP?', answer: 'x' })).toThrow(DuplicateError);
  });

  it('new cards are due immediately and leave the queue once reviewed', () => {
    let { db, conceptId } = seed();
    let added;
    [db, added] = addCards(db, conceptId, [{ question: 'Q1?', answer: 'A' }, { question: 'Q2?', answer: 'B' }], newId, NOW);
    expect(dueCards(db, NOW)).toHaveLength(2);
    db = reviewCard(db, added[0]!.id, 4, NOW);
    expect(dueCards(db, NOW).map((c) => c.question)).toEqual(['Q2?']);
    expect(db.cards[added[0]!.id]!.review.interval_days).toBe(3); // "good" on the first review
  });
});

describe('sessions', () => {
  it('sets concept mastery to the latest score', () => {
    let { db, conceptId } = seed();
    [db] = addSession(db, conceptId, 'text', evaluation, newId, NOW);
    expect(db.concepts[conceptId]!.mastery_level).toBe(64);
  });
});

describe('computeStats', () => {
  it('counts due cards, today, streak and forecast', () => {
    let { db, conceptId } = seed();
    let added;
    [db, added] = addCards(db, conceptId, [1, 2, 3].map((i) => ({ question: `Q${i}?`, answer: 'A' })), newId, NOW);
    db = reviewCard(db, added[0]!.id, 5, NOW); // easy on first review: due in 4 days
    db = reviewCard(db, added[1]!.id, 1, NOW); // lapse: due tomorrow
    // Reviews on the two previous days extend the streak.
    db = { ...db, reviewDays: { ...db.reviewDays, [dayKey(new Date(2026, 8, 23))]: { reviewed: 3, correct: 3 }, [dayKey(new Date(2026, 8, 22))]: { reviewed: 1, correct: 0 } } };

    const s = computeStats(db, NOW);
    expect(s).toMatchObject({ due_now: 1, due_today: 1, reviewed_today: 2, correct_today: 1, streak_days: 3, total_cards: 3, total_concepts: 1 });
    expect(s.forecast.map((d) => d.count)).toEqual([1, 1, 0, 0, 1, 0, 0]);
    expect(s.history.at(-1)).toEqual({ date: dayKey(NOW), count: 2 });
  });

  it('keeps yesterday\'s streak before today\'s first review', () => {
    const db = { ...emptyDB(), reviewDays: { [dayKey(new Date(2026, 8, 23))]: { reviewed: 1, correct: 1 } } };
    expect(computeStats(db, NOW).streak_days).toBe(1);
  });
});

describe('backup', () => {
  it('round-trips and rejects other files', () => {
    const { db } = seed();
    expect(fromBackup(toBackup(db, NOW))).toEqual(db);
    expect(() => fromBackup('{"hello":1}')).toThrow();
    expect(() => fromBackup('not json')).toThrow();
  });
});

describe('questionKey', () => {
  it('ignores case, spacing and punctuation, in any script', () => {
    const { questionKey } = jest.requireActual('../logic');
    expect(questionKey('What is ATP?')).toBe(questionKey('  what is  atp '));
    expect(questionKey('מהי פוטוסינתזה?')).toBe('מהיפוטוסינתזה');
    expect(questionKey('“Why?” (short)')).toBe('whyshort');
  });
});

describe('guided courses', () => {
  const L = jest.requireActual('../logic');
  const course = {
    id: 'demo',
    title: 'Biology',
    description: '',
    icon: 'leaf-outline',
    builtIn: true,
    levels: [
      {
        key: 'foundations',
        quiz: [{ question: 'q', options: ['a', 'b'], correct: 0 }, { question: 'q', options: ['a', 'b'], correct: 0 }, { question: 'q', options: ['a', 'b'], correct: 0 }],
        stations: [
          { key: 'a', title: 'Cells', summary: 's', explanation: 'e', cards: [{ question: 'Q1?', answer: 'A1' }, { question: 'Q2?', answer: 'A2' }] },
          { key: 'b', title: 'DNA', summary: 's', explanation: 'e', cards: [{ question: 'Q3?', answer: 'A3' }] },
        ],
      },
      {
        key: 'advanced',
        quiz: [{ question: 'q', options: ['a', 'b'], correct: 0 }, { question: 'q', options: ['a', 'b'], correct: 0 }, { question: 'q', options: ['a', 'b'], correct: 0 }],
        stations: [{ key: 'c', title: 'Enzymes', summary: 's' }],
      },
      { key: 'bachelor', quiz: [], stations: [{ key: 'd', title: 'Signaling', summary: 's' }] },
    ],
  };
  const find = (id: string) => (id === course.id ? course : undefined);

  it('starting a station creates the course subject, the concept and its cards, once', () => {
    let db = emptyDB();
    let id1: string, again: string;
    [db, id1] = L.startStation(db, course, 'a', newId, NOW);
    [db, again] = L.startStation(db, course, 'a', newId, NOW);
    expect(again).toBe(id1);
    expect(Object.values(db.subjects)).toHaveLength(1);
    expect(Object.values(db.subjects)[0]).toMatchObject({ title: 'Biology', course_id: 'demo' });
    expect(Object.values(db.cards)).toHaveLength(2);
    expect(L.stationOf(db, id1, find)?.station.key).toBe('a');
  });

  it('a station without a lesson cannot start until one is saved', () => {
    let db = emptyDB();
    expect(() => L.startStation(db, course, 'c', newId, NOW)).toThrow('no lesson');
    db = L.saveLesson(db, 'demo', 'c', { explanation: 'Enzymes speed up reactions.', cards: [{ question: 'What do enzymes do?', answer: 'Speed up reactions.' }] });
    let id: string;
    [db, id] = L.startStation(db, course, 'c', newId, NOW);
    expect(L.stationOf(db, id, find)?.lesson?.explanation).toBe('Enzymes speed up reactions.');
    expect(L.courseProgress(db, course).stations[2].hasLesson).toBe(true);
  });

  it('does not collide with a subject of the same name the learner made', () => {
    let db = emptyDB();
    [db] = saveSubject(db, { title: 'biology' }, newId, NOW);
    [db] = L.startStation(db, course, 'b', newId, NOW);
    expect(Object.values(db.subjects).map((s) => s.title).sort()).toEqual(['Biology (2)', 'biology']);
  });

  it('tracks progress across levels and recommends the first station not done', () => {
    let db = emptyDB();
    expect(L.courseProgress(db, course)).toMatchObject({ total: 4, done: 0, nextKey: 'a' });
    let id: string;
    [db, id] = L.startStation(db, course, 'a', newId, NOW);
    expect(L.courseProgress(db, course).stations[0].status).toBe('started');
    [db] = addSession(db, id, 'text', { ...evaluation, comprehension_score: 85 }, newId, NOW);
    const p = L.courseProgress(db, course);
    expect(p).toMatchObject({ mastered: 1, done: 1, nextKey: 'b' });
    expect(p.levels.map((l: { done: number; total: number }) => [l.done, l.total])).toEqual([[1, 2], [0, 1], [0, 1]]);
  });

  describe('placement', () => {
    it('climbs while levels are passed and stops at the first one that is not', () => {
      let s = L.startPlacement();
      s = L.finishPlacementLevel(course, s, 3); // foundations passed
      expect(s).toMatchObject({ done: false, levelIndex: 1 });
      s = L.finishPlacementLevel(course, s, 1); // advanced failed
      expect(s).toMatchObject({ done: true, resultLevel: 1, scores: [3, 1] });
    });

    it('failing the first level places at the start', () => {
      expect(L.finishPlacementLevel(course, L.startPlacement(), 1)).toMatchObject({ done: true, resultLevel: 0 });
    });

    it('a level without questions ends the test at that level', () => {
      let s = L.finishPlacementLevel(course, L.startPlacement(), 2);
      s = L.finishPlacementLevel(course, s, 3);
      expect(s).toMatchObject({ done: true, resultLevel: 2 });
    });

    it('marks levels below the placement as known and moves the next station up', () => {
      let db = emptyDB();
      let s = L.finishPlacementLevel(course, L.startPlacement(), 3);
      s = L.finishPlacementLevel(course, s, 0);
      db = L.savePlacement(db, 'demo', s, NOW);
      const p = L.courseProgress(db, course);
      expect(p.stations.map((x: { status: string }) => x.status)).toEqual(['known', 'known', 'new', 'new']);
      expect(p).toMatchObject({ done: 2, nextKey: 'c' });
      expect(p.levels[0].known).toBe(true);
    });

    it('two thirds is the pass mark', () => {
      expect(L.passesLevel(2, 3)).toBe(true);
      expect(L.passesLevel(1, 3)).toBe(false);
      expect(L.passesLevel(0, 0)).toBe(false);
    });
  });
});

describe('standalone concepts', () => {
  const L = jest.requireActual('../logic');
  it('go into one catch-all subject, without duplicates, and can get a lesson', () => {
    let db = emptyDB();
    let a: string, b: string, again: string;
    [db, a] = L.addLooseConcept(db, 'Entropy', 'Standalone', newId, NOW);
    [db, b] = L.addLooseConcept(db, 'Opportunity cost', 'Standalone', newId, NOW);
    [db, again] = L.addLooseConcept(db, ' entropy ', 'Standalone', newId, NOW);
    expect(again).toBe(a);
    expect(Object.values(db.subjects)).toHaveLength(1);
    expect(Object.values(db.subjects)[0]).toMatchObject({ title: 'Standalone', loose: true });
    db = L.saveConceptLesson(db, b, { explanation: 'What you give up.', cards: [{ question: 'Q?', answer: 'A' }] }, newId, NOW);
    expect(db.concepts[b]!.lesson).toBe('What you give up.');
    expect(Object.values(db.cards)).toHaveLength(1);
  });
});

describe('questions about a lesson', () => {
  const L = jest.requireActual('../logic');
  const turn = (n: number) => ({ id: `q${n}`, question: `Q${n}?`, answer: `A${n}.`, follow_ups: [], asked_at: NOW.toISOString() });

  it('appends turns per thread and keeps only the most recent ones', () => {
    let db = emptyDB();
    for (let i = 0; i < L.MAX_QA_TURNS + 5; i++) db = L.addQuestion(db, 'physics/velocity', turn(i));
    db = L.addQuestion(db, 'physics/inertia', turn(99));
    const thread = db.questions['physics/velocity']!;
    expect(thread).toHaveLength(L.MAX_QA_TURNS);
    expect(thread[0]!.id).toBe('q5');
    expect(thread[thread.length - 1]!.id).toBe(`q${L.MAX_QA_TURNS + 4}`);
    expect(db.questions['physics/inertia']).toHaveLength(1);
  });

  it('clears one thread without touching others', () => {
    let db = L.addQuestion(L.addQuestion(emptyDB(), 'a/1', turn(1)), 'a/2', turn(2));
    db = L.clearQuestions(db, 'a/1');
    expect(db.questions['a/1']).toBeUndefined();
    expect(db.questions['a/2']).toHaveLength(1);
    expect(L.clearQuestions(db, 'missing')).toBe(db);
  });

  it('deleting a concept or its subject deletes its lesson questions', () => {
    const { db: seeded, subjectId, conceptId } = seed();
    const db = L.addQuestion(L.addQuestion(seeded, L.conceptThreadKey(conceptId), turn(1)), 'physics/velocity', turn(2));
    expect(L.deleteConcept(db, conceptId).questions).toEqual({ 'physics/velocity': [turn(2)] });
    expect(deleteSubject(db, subjectId).questions).toEqual({ 'physics/velocity': [turn(2)] });
  });

  it('survive a backup round trip, and old backups get an empty map', () => {
    const db = L.addQuestion(emptyDB(), 'physics/velocity', turn(1));
    expect(fromBackup(toBackup(db, NOW)).questions).toEqual(db.questions);
    const old = JSON.parse(toBackup(emptyDB(), NOW));
    delete old.data.questions;
    expect(fromBackup(JSON.stringify(old)).questions).toEqual({});
  });
});

describe('calendarMonth', () => {
  const L = jest.requireActual('../logic');

  it('shows past reviews, today with overdue cards, and cards coming due', () => {
    const { db: seeded, conceptId } = seed();
    let db = addCards(seeded, conceptId, [{ question: 'a?', answer: 'a' }, { question: 'b?', answer: 'b' }, { question: 'c?', answer: 'c' }], newId, NOW)[0];
    const [c1, c2, c3] = Object.keys(db.cards);
    const at = (d: number) => new Date(2026, 8, d, 9).toISOString();
    const setDue = (id: string, iso: string) => ({ ...db.cards, [id]: { ...db.cards[id]!, review: { ...db.cards[id]!.review, next_review_date: iso } } });
    db = { ...db, cards: setDue(c1!, at(20)) }; // overdue → today
    db = { ...db, cards: setDue(c2!, at(24)) }; // today
    db = { ...db, cards: setDue(c3!, at(28)) }; // later this month
    db = { ...db, reviewDays: { '2026-09-22': { reviewed: 7, correct: 5 }, '2026-09-24': { reviewed: 2, correct: 2 } } };

    const days = L.calendarMonth(db, 2026, 8, NOW); // NOW = 24 Sep 2026
    expect(days).toHaveLength(30);
    const day = (n: number) => days[n - 1];
    expect(day(22)).toMatchObject({ reviewed: 7, correct: 5, due: 0, isPast: true });
    expect(day(20)).toMatchObject({ due: 0, isPast: true });
    expect(day(24)).toMatchObject({ isToday: true, reviewed: 2, due: 2 });
    expect(day(28)).toMatchObject({ due: 1, reviewed: 0, isPast: false });
    expect(L.calendarMonth(db, 2026, 1, NOW)).toHaveLength(28);
  });
});

describe('reviewQueue and study time', () => {
  const L = jest.requireActual('../logic');
  const opts = { newPerDay: 100, maxPerDay: 1000, order: 'due' as const };

  function withCards() {
    const { db: seeded, conceptId, subjectId } = seed();
    const cards = Array.from({ length: 6 }, (_, i) => ({ question: `q${i}?`, answer: `a${i}` }));
    let db = addCards(seeded, conceptId, cards, newId, NOW)[0];
    const ids = Object.keys(db.cards);
    // Cards 0–2 were reviewed before (easiness 2.6, 2.0, 1.5), due yesterday; 3–5 are new.
    [2.6, 2.0, 1.5].forEach((ef, i) => {
      const c = db.cards[ids[i]!]!;
      db = { ...db, cards: { ...db.cards, [c.id]: { ...c, review: { ...c.review, easiness_factor: ef, last_reviewed_at: '2026-09-20T10:00:00.000Z', next_review_date: `2026-09-23T0${i}:00:00.000Z` } } } };
    });
    return { db, ids, conceptId, subjectId };
  }

  it('puts reviews first, then new cards, within the daily limits', () => {
    const { db, ids } = withCards();
    expect(L.reviewQueue(db, NOW, opts).map((c: { id: string }) => c.id)).toEqual(ids);
    expect(L.reviewQueue(db, NOW, { ...opts, newPerDay: 1 })).toHaveLength(4);
    expect(L.reviewQueue(db, NOW, { ...opts, maxPerDay: 2 })).toHaveLength(2);
    const busy = { ...db, reviewDays: { [dayKey(NOW)]: { reviewed: 5, correct: 5, introduced: 1 } } };
    expect(L.reviewQueue(busy, NOW, { ...opts, newPerDay: 2, maxPerDay: 7 })).toHaveLength(2);
  });

  it('orders hardest first and filters hard cards and subjects', () => {
    const { db, ids, subjectId } = withCards();
    expect(L.reviewQueue(db, NOW, { ...opts, order: 'hardest' }).slice(0, 3).map((c: { id: string }) => c.id)).toEqual([ids[2], ids[1], ids[0]]);
    expect(L.reviewQueue(db, NOW, { ...opts, hardOnly: true }).map((c: { id: string }) => c.id)).toEqual([ids[1], ids[2]]);
    expect(L.reviewQueue(db, NOW, { ...opts, subjectId })).toHaveLength(6);
    expect(L.reviewQueue(db, NOW, { ...opts, subjectId: 'other' })).toHaveLength(0);
  });

  it('counts new cards introduced today, and estimates minutes studied', () => {
    const { db, ids } = withCards();
    let next = reviewCard(db, ids[3]!, 4, NOW); // new card
    next = reviewCard(next, ids[0]!, 4, NOW); // seen before
    expect(next.reviewDays[dayKey(NOW)]).toEqual({ reviewed: 2, correct: 2, introduced: 1 });
    expect(L.studyMinutesToday({ ...next, reviewDays: { [dayKey(NOW)]: { reviewed: 30, correct: 20 } } }, NOW)).toBe(10);
  });
});

describe('week, progress and achievements', () => {
  const L = jest.requireActual('../logic');

  it('gives the current week from Sunday to Saturday', () => {
    const { db } = seed();
    const week = L.calendarWeek(db, NOW); // Thursday 24 Sep 2026
    expect(week.map((d: { date: string }) => d.date)).toEqual(['2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26']);
    expect(week[4]).toMatchObject({ isToday: true });
  });

  it('sums the week, overall accuracy and the best streak', () => {
    const { db: seeded } = seed();
    const db = {
      ...seeded,
      reviewDays: {
        '2026-09-01': { reviewed: 30, correct: 20 },
        '2026-09-02': { reviewed: 30, correct: 30 },
        '2026-09-03': { reviewed: 30, correct: 25 },
        '2026-09-23': { reviewed: 9, correct: 9 },
        '2026-09-24': { reviewed: 1, correct: 1 },
      },
    };
    const p = L.progressSummary(db, NOW);
    expect(p).toMatchObject({ totalReviews: 100, accuracy: 85, streak: 2, bestStreak: 3, concepts: 1 });
    // 10 reviews ≈ 3 minutes, plus the concept started in the seed (not from a course).
    expect(p.weekMinutes).toBeGreaterThanOrEqual(3);

    const earned = L.achievements(db, NOW).filter((a: { earned: boolean }) => a.earned).map((a: { key: string }) => a.key);
    expect(earned).toEqual(expect.arrayContaining(['firstReview', 'streak3', 'reviews100']));
    expect(earned).not.toContain('streak7');
    expect(L.achievements(db, NOW)).toHaveLength(8);
  });

  it('has no accuracy before the first review', () => {
    const { db } = seed();
    expect(L.progressSummary(db, NOW).accuracy).toBeNull();
    expect(L.achievements(db, NOW).every((a: { key: string; earned: boolean }) => !a.earned || a.key === 'firstStation' || a.key === 'firstExplain')).toBe(true);
  });
});

describe('subjectPath and the tutor chat', () => {
  const L = jest.requireActual('../logic');

  it('lays a subject out in units, marks mastered and started concepts, and finds the next one', () => {
    const { db: seeded, subjectId, conceptId } = seed();
    let db = seeded;
    for (let i = 0; i < 6; i++) db = L.saveConcept(db, { subjectId, title: `מושג ${i}` }, newId, new Date(2026, 8, 25 + i))[0];
    db = { ...db, concepts: { ...db.concepts, [conceptId]: { ...db.concepts[conceptId]!, mastery_level: 80 } } };
    const path = L.subjectPath(db, subjectId);
    expect(path.units.map((u: unknown[]) => u.length)).toEqual([5, 2]);
    expect(path.units[0][0]).toMatchObject({ id: conceptId, status: 'mastered' });
    expect(path.units[0][1].status).toBe('new');
    expect(path.nextId).toBe(path.units[0][1].id);
    expect(path).toMatchObject({ done: 1, total: 7 });
  });

  it('keeps a conversation per concept, hands the tutor only explanations, answers and feedback', () => {
    const { db: seeded, conceptId } = seed();
    const at = NOW.toISOString();
    const feedback = { score: 60, question: 'למה?', next_step: 'answer_question', refine_quote: '', primary_gap: 'x', misconceptions: [], jargon: [] };
    let db = L.addTutorTurns(seeded, conceptId, [
      { id: 'a', role: 'learner', kind: 'explanation', text: 'הסבר ראשון', at },
      { id: 'b', role: 'tutor', kind: 'feedback', text: 'טוב, חסר למה.', at, evaluation: feedback },
      { id: 'c', role: 'learner', kind: 'clarify', text: 'לא הבנתי את השאלה', at },
      { id: 'd', role: 'tutor', kind: 'clarification', text: 'הכוונה היא…', at },
      { id: 'e', role: 'learner', kind: 'revision', text: 'הסבר מתוקן', at },
    ]);
    const chat = db.tutorChats[conceptId];
    expect(L.tutorConversation(chat)).toEqual([
      { role: 'learner', text: 'הסבר ראשון' },
      { role: 'tutor', text: 'טוב, חסר למה.\nלמה?' },
      { role: 'learner', text: 'הסבר מתוקן' },
    ]);
    expect(L.latestExplanation(chat)).toBe('הסבר מתוקן');
    expect(L.lastFeedback(chat).id).toBe('b');
    expect(L.deleteConcept(db, conceptId).tutorChats[conceptId]).toBeUndefined();
    db = L.clearTutorChat(db, conceptId);
    expect(db.tutorChats[conceptId]).toBeUndefined();
    expect(() => L.addTutorTurns(db, 'missing', [])).toThrow();
  });
});

describe('structured lessons and tutor help', () => {
  const L = jest.requireActual('../logic');
  const parts = {
    hook: 'למה?',
    sections: [{ heading: 'א', body: 'גוף א' }, { heading: 'ב', body: 'גוף ב' }],
    example: { title: 'דוגמה', body: 'מספרים' },
    check: [{ question: 'ש?', options: ['1', '2', '3', '4'], correct: 2, why: 'כי' }],
  };

  it('saves a concept lesson with its parts and keeps existing cards on rewrite', () => {
    const { db: seeded, conceptId } = seed();
    const lesson = { explanation: 'טקסט', parts, cards: [{ question: 'q1?', answer: 'a1' }] };
    let db = L.saveConceptLesson(seeded, conceptId, lesson, newId, NOW);
    expect(db.concepts[conceptId].lessonParts).toEqual(parts);
    const before = L.cardsOf(db, conceptId).length;
    db = L.saveConceptLesson(db, conceptId, { ...lesson, cards: [{ question: 'q1?', answer: 'other' }, { question: 'q2?', answer: 'a2' }] }, newId, NOW);
    expect(L.cardsOf(db, conceptId).length).toBe(before + 1);
  });

  it('a built-in station with parts yields its plain text and parts', () => {
    const course = { id: 'c', title: 'C', description: '', icon: 'x', builtIn: true, levels: [{ key: 'foundations', quiz: [], stations: [{ key: 's', title: 'S', summary: 'סיכום', parts, cards: [{ question: 'q?', answer: 'a' }] }] }] };
    const lesson = L.lessonFor(seed().db, course, course.levels[0]!.stations[0]);
    expect(lesson.parts).toBe(parts);
    expect(lesson.explanation).toContain('א\nגוף א');
    expect(lesson.explanation).toContain('דוגמה\nמספרים');
  });

  it('reveals hints one by one (never past the last), then the answer and the model explanation', () => {
    const { db: seeded, conceptId } = seed();
    const at = NOW.toISOString();
    const evaluation = { score: 50, question: '?', next_step: 'answer_question', refine_quote: '', primary_gap: '', misconceptions: [], jargon: [], hints: ['h1', 'h2'] };
    let db = L.addTutorTurns(seeded, conceptId, [{ id: 'f', role: 'tutor', kind: 'feedback', text: '', at, evaluation }]);
    const shown = () => db.tutorChats[conceptId][0].evaluation.shown;
    db = L.revealTutorHelp(db, conceptId, 'f', 'hint');
    db = L.revealTutorHelp(db, conceptId, 'f', 'hint');
    db = L.revealTutorHelp(db, conceptId, 'f', 'hint');
    expect(shown()).toEqual({ hints: 2, answer: false, model: false });
    db = L.revealTutorHelp(db, conceptId, 'f', 'answer');
    db = L.revealTutorHelp(db, conceptId, 'f', 'model');
    expect(shown()).toEqual({ hints: 2, answer: true, model: true });
    expect(() => L.revealTutorHelp(db, conceptId, 'nope', 'hint')).toThrow();
  });

  it('remembers the tutor\'s main gap on the session', () => {
    const { db: seeded, conceptId } = seed();
    const [db, id] = L.addSession(seeded, conceptId, 'הסבר', { ...evaluation, primary_gap: 'למה זה קורה' }, newId, NOW);
    expect(db.sessions[id].primary_gap).toBe('למה זה קורה');
  });
});

describe('learning on paper', () => {
  const L = jest.requireActual('../logic');
  const { physics } = jest.requireActual('../../content/courses/physics');
  const find = (id: string) => (id === 'physics' ? physics : undefined);
  const kit = {
    id: 'k1',
    year: 2026,
    month: 8,
    created_at: '2026-09-01T00:00:00.000Z',
    stations: [
      { n: 1, courseId: 'physics', key: 'velocity', title: 'מהירות', learn: '2026-09-01' },
      { n: 2, courseId: 'physics', key: 'inertia', title: 'התמדה', learn: '2026-09-02' },
      { n: 3, courseId: 'physics', key: 'newton2', title: 'ניוטון', learn: '2026-09-03' },
    ],
  };

  it('saves a kit and finds the open one', () => {
    const db = L.savePrintKit(seed().db, kit);
    expect(L.openPrintKit(db).id).toBe('k1');
    expect(L.openPrintKit({ ...db, printKits: { k1: { ...kit, applied_at: 'x' } } })).toBeNull();
  });

  it('starts the lessons marked as done and schedules their cards by the self-rating', () => {
    let db = L.savePrintKit(seed().db, kit);
    db = L.applyPaperResults(db, 'k1', [{ n: 1, done: true, stars: 5 }, { n: 2, done: true, stars: 2 }, { n: 3, done: false, stars: 0 }], find, newId, NOW);
    const concepts = (Object.values(db.concepts) as { id: string; course_key?: string }[]).filter((c) => c.course_key) as { id: string; course_key: string }[];
    expect(concepts.map((c) => c.course_key).sort()).toEqual(['inertia', 'velocity']);
    const dueDay = (key: string) => {
      const id = concepts.find((c) => c.course_key === key)!.id;
      return new Set(L.cardsOf(db, id).map((c: { review: { next_review_date: string } }) => new Date(c.review.next_review_date).getDate()));
    };
    expect(dueDay('velocity')).toEqual(new Set([NOW.getDate() + 14 - 30])); // 24 Sep + 14 = 8 Oct
    expect(dueDay('inertia')).toEqual(new Set([25]));
    expect(db.printKits.k1.applied_at).toBe(NOW.toISOString());
    expect(() => L.applyPaperResults(db, 'nope', [], find, newId, NOW)).toThrow();
  });
});
