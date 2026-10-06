import type { LocalDB } from '@/local/types';
import { stationsOf, type Course } from './types';

export interface SearchHit {
  kind: 'course' | 'station' | 'concept';
  id: string;
  title: string;
  /** Where it lives: the course (stations) or the subject (concepts). */
  context: string;
  href: string;
}

/** Normalizes for matching: case, Hebrew niqqud and geresh/quote marks don't matter. */
const norm = (s: string) =>
  s
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[֑-ׇ̀-ͯ]/g, '')
    .replace(/["'״׳`]/g, '');

/** Courses, stations and library concepts whose title (or a station's summary) contains the query. */
export function searchAll(db: LocalDB, courses: readonly Course[], query: string, limit = 30): SearchHit[] {
  const q = norm(query.trim());
  if (q.length < 2) return [];
  const hits: SearchHit[] = [];
  for (const course of courses) {
    if (norm(course.title).includes(q)) hits.push({ kind: 'course', id: course.id, title: course.title, context: course.description, href: `/course/${course.id}` });
  }
  for (const concept of Object.values(db.concepts)) {
    if (norm(concept.title).includes(q))
      hits.push({ kind: 'concept', id: concept.id, title: concept.title, context: db.subjects[concept.subject_id]?.title ?? '', href: `/concept/${concept.id}` });
  }
  const stations: SearchHit[] = [];
  for (const course of courses) {
    for (const { station } of stationsOf(course)) {
      const inTitle = norm(station.title).includes(q);
      if (inTitle || norm(station.summary).includes(q))
        (inTitle ? hits : stations).push({ kind: 'station', id: `${course.id}/${station.key}`, title: station.title, context: course.title, href: `/course/${course.id}/${station.key}` });
    }
  }
  return [...hits, ...stations].slice(0, limit);
}

