import { useMutation } from '@tanstack/react-query';
import { parseLessonImport } from '@/content/import';
import { addSelfCheck, IMPORTED_COURSE_ID, importLessons, type ImportTexts } from '@/local/logic';
import { commit, newId } from '@/local/store';
import { read } from './local';

/** Parses pasted JSON and adds its lessons to the imported course; throws ImportError on bad input. */
export function useImportLessons() {
  return useMutation({
    mutationFn: ({ text, texts }: { text: string; texts: ImportTexts }) =>
      read(() => {
        const items = parseLessonImport(text);
        const result = commit((db) => importLessons(db, items, texts, new Date()));
        return { ...result, courseId: IMPORTED_COURSE_ID };
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
