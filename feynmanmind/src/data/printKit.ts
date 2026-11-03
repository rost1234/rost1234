import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { generateLesson } from '@/api/functions';
import { stationsOf } from '@/content/types';
import { applyPaperResults, courseProgress, lessonFor, savePrintKit, saveLesson } from '@/local/logic';
import { getDB, newId, useDBStore } from '@/local/store';
import type { PrintKit } from '@/local/types';
import type { MonthPlan, PlanStation } from '@/print/plan';
import { allCourses, findCourse } from './courses';

/**
 * The next stations to learn, `count` in all, alternating between the chosen
 * courses: each continues from its first station that isn't mastered or known.
 */
export function nextStations(courseIds: string[], count: number): PlanStation[] {
  const db = getDB();
  const queues = courseIds
    .map((id) => findCourse(id))
    .filter((c): c is NonNullable<typeof c> => !!c)
    .map((course) => {
      const progress = courseProgress(db, course);
      const done = new Set(progress.stations.filter((p) => p.status === 'mastered' || p.status === 'known').map((p) => p.key));
      const started = new Set(progress.stations.filter((p) => p.status === 'started').map((p) => p.key));
      return stationsOf(course)
        .filter(({ station }) => !done.has(station.key) && !started.has(station.key))
        .map(({ station }): PlanStation => {
          const lesson = lessonFor(db, course, station);
          return {
            courseId: course.id,
            courseTitle: course.title,
            key: station.key,
            title: station.title,
            unit: station.unit,
            parts: lesson?.parts ?? null,
            text: lesson && !lesson.parts ? lesson.explanation : '',
            summary: station.summary,
            cards: lesson?.cards ?? [],
          };
        });
    });
  const out: PlanStation[] = [];
  for (let i = 0; out.length < count && queues.some((q) => q.length > i); i++) for (const q of queues) if (q[i] && out.length < count) out.push(q[i]!);
  return out;
}

/** Courses worth offering: the ones you started first, then the rest. */
export function printableCourses() {
  const db = getDB();
  return allCourses()
    .map((course) => ({ course, started: courseProgress(db, course).started > 0 }))
    .sort((a, b) => Number(b.started) - Number(a.started));
}

/**
 * Has the AI write the lessons the plan still lacks (upper levels), one by one,
 * and saves them like opening the station would. Lessons that fail stay as a
 * title and summary on paper.
 */
export async function writeMissingLessons(stations: PlanStation[], onProgress: (done: number, total: number) => void): Promise<PlanStation[]> {
  const missing = stations.filter((s) => !s.parts && !s.text);
  let done = 0;
  onProgress(0, missing.length);
  const out: PlanStation[] = [];
  for (const s of stations) {
    if (s.parts || s.text) {
      out.push(s);
      continue;
    }
    const course = findCourse(s.courseId);
    const refs = course ? stationsOf(course) : [];
    const ref = refs.find((r) => r.station.key === s.key);
    try {
      if (!course || !ref) throw new Error('station');
      const { lesson } = await generateLesson({
        concept_title: s.title,
        summary: s.summary,
        unit: s.unit,
        course_title: course.title,
        level: ref.level.key,
        previous_titles: refs.slice(Math.max(0, ref.index - 40), ref.index).map((r) => r.station.title),
        language: 'he',
      });
      useDBStore.getState().update((db) => saveLesson(db, course.id, s.key, lesson));
      out.push({ ...s, parts: lesson.parts ?? null, text: lesson.parts ? '' : lesson.explanation, cards: lesson.cards });
    } catch {
      out.push(s);
    }
    onProgress(++done, missing.length);
  }
  return out;
}

/** Reviews the app already has scheduled in that month (one entry per concept per day), by date. */
export function scheduledReviews(year: number, month: number, now = new Date()): Record<string, string[]> {
  const db = getDB();
  const out: Record<string, Set<string>> = {};
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (const card of Object.values(db.cards)) {
    const due = new Date(card.review.next_review_date);
    const day = due < today ? today : due;
    if (day.getFullYear() !== year || day.getMonth() !== month) continue;
    const title = db.concepts[card.concept_id]?.title;
    if (!title) continue;
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    (out[key] ??= new Set()).add(title);
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, [...v]]));
}

/** Remembers what was printed, so the results can be entered at the end of the month. */
export function rememberKit(plan: MonthPlan): string {
  const id = newId();
  const kit: PrintKit = {
    id,
    year: plan.year,
    month: plan.month,
    created_at: new Date().toISOString(),
    stations: plan.stations.map((s) => ({ n: s.n, courseId: s.courseId, key: s.key, title: s.title, learn: s.learn })),
  };
  useDBStore.getState().update((db) => savePrintKit(db, kit));
  return id;
}

export function enterPaperResults(kitId: string, results: { n: number; done: boolean; stars: number }[]) {
  useDBStore.getState().update((db) => applyPaperResults(db, kitId, results, findCourse, newId, new Date()));
}

/** A4 landscape in points. */
const A4_LANDSCAPE = { width: 842, height: 595 };

/** Opens the system print dialog (printer, or "Save as PDF"). */
export async function printKit(html: string): Promise<void> {
  if (Platform.OS === 'web') {
    const w = window.open('', '_blank');
    if (!w) throw new Error('popup blocked');
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
    return;
  }
  await Print.printAsync({ html, orientation: Print.Orientation.landscape, ...A4_LANDSCAPE });
}

/** Makes a PDF and opens the share sheet (send to email, WhatsApp, Drive…). */
export async function shareKitPdf(html: string, name: string): Promise<void> {
  if (Platform.OS === 'web') return printKit(html);
  const { uri } = await Print.printToFileAsync({ html, ...A4_LANDSCAPE });
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device');
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: name });
}
