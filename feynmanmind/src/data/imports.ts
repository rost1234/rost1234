import { useMutation } from '@tanstack/react-query';
import { generateLesson } from '@/api/functions';
import { parseLessonImport } from '@/content/import';
import { findStation, stationsOf } from '@/content/types';
import { importLessons, isImportedCourse, saveImportedLesson, type ImportTexts } from '@/local/logic';
import { commit, getDB, newId, useDBStore } from '@/local/store';
import { NotFoundError } from '@/local/types';
import { read } from './local';

/** Parses pasted JSON and adds its lessons to the imported course; throws ImportError on bad input. */
export function useImportLessons() {
  return useMutation({
    mutationFn: ({ text, texts }: { text: string; texts: ImportTexts }) =>
      read(() => {
        const items = parseLessonImport(text);
        return commit((db) => importLessons(db, items, texts, new Date()));
      }),
  });
}

/** Asks the AI for a full lesson (sections, example, misconception, check questions, cards) grounded in the station's reference. */
export async function upgradeOne(courseId: string, key: string): Promise<void> {
  const course = getDB().courses[courseId];
  const ref = course && isImportedCourse(courseId) ? findStation(course, key) : undefined;
  if (!course || !ref?.station.reference) throw new NotFoundError('Station');
  const { station } = ref;
  const { lesson } = await generateLesson({
    concept_title: station.title,
    summary: station.summary,
    unit: station.unit,
    course_title: course.title,
    level: 'standalone',
    // Earlier lessons of the same topic, so this one builds on them.
    previous_titles: stationsOf(course)
      .slice(0, ref.index)
      .filter((s) => s.station.unit === station.unit)
      .map((s) => s.station.title),
    language: 'he',
    reference: station.reference,
    key_points: station.keyPoints,
  });
  useDBStore.getState().update((db) => saveImportedLesson(db, courseId, key, lesson, newId, new Date()));
}

export function useUpgradeImported() {
  return useMutation({ mutationFn: ({ courseId, key }: { courseId: string; key: string }) => upgradeOne(courseId, key) });
}
