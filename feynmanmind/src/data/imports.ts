import { useMutation } from '@tanstack/react-query';
import { generateLesson } from '@/api/functions';
import { parseLessonImport } from '@/content/import';
import { findStation, stationsOf } from '@/content/types';
import { addSelfCheck, importedWithoutLesson, importLessons, isImportedCourse, saveImportedLesson, type ImportTexts } from '@/local/logic';
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

/** Saves a self-rated explanation of an imported lesson (sets the concept's mastery). */
export function useSelfCheck() {
  return useMutation({
    mutationFn: ({ conceptId, explanation, rating }: { conceptId: string; explanation: string; rating: number }) =>
      read(() => commit((db) => addSelfCheck(db, conceptId, explanation, rating, newId, new Date()))),
  });
}

/** Asks the AI for a full lesson (sections, example, misconception, check questions, cards) grounded in the station's reference. */
async function upgradeOne(courseId: string, key: string): Promise<void> {
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

/** Upgrades every lesson of an imported course that has no full lesson yet, one at a time; stops at the first error. */
export function useUpgradeAllImported() {
  return useMutation({
    mutationFn: async ({ courseId, onProgress }: { courseId: string; onProgress: (done: number, total: number) => void }) => {
      const todo = importedWithoutLesson(getDB(), courseId).map((t) => t.station.key);
      for (let i = 0; i < todo.length; i++) {
        onProgress(i, todo.length);
        await upgradeOne(courseId, todo[i]!);
      }
      onProgress(todo.length, todo.length);
      return todo.length;
    },
  });
}
