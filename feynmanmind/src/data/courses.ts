import { useMutation, useQuery } from '@tanstack/react-query';
import { generateCourse } from '@/api/functions';
import { BUILT_IN_COURSES, builtInCourse } from '@/content/catalog';
import type { Course } from '@/content/types';
import { courseProgress, deleteCustomCourse, saveCustomCourse, startStation, stationOf } from '@/local/logic';
import { commit, getDB, newId, useDBStore } from '@/local/store';
import { NotFoundError } from '@/local/types';
import { read } from './local';

/** Built-in courses first, then the learner's AI courses (newest first). */
export function allCourses(): Course[] {
  const custom = Object.values(getDB().courses).sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
  return [...BUILT_IN_COURSES, ...custom];
}

export const findCourse = (id: string): Course | undefined => builtInCourse(id) ?? getDB().courses[id];

export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: () => read(() => allCourses().map((course) => ({ course, progress: courseProgress(getDB(), course) }))),
  });
}

export function useCourse(id: string) {
  return useQuery({
    queryKey: ['courses', id],
    queryFn: () =>
      read(() => {
        const course = findCourse(id);
        if (!course) throw new NotFoundError('Course');
        return { course, progress: courseProgress(getDB(), course) };
      }),
  });
}

/** The course station a library concept came from, so its lesson can be shown. */
export function useConceptStation(conceptId: string) {
  return useQuery({
    queryKey: ['courses', 'station', conceptId],
    queryFn: () => read(() => stationOf(getDB(), conceptId, findCourse)),
  });
}

/** Adds the station's concept and flashcards to the library (once) and returns the concept id. */
export function useStartStation() {
  return useMutation({
    mutationFn: ({ courseId, key }: { courseId: string; key: string }) =>
      read(() => {
        const course = findCourse(courseId);
        if (!course) throw new NotFoundError('Course');
        return commit((db) => startStation(db, course, key, newId, new Date()));
      }),
  });
}

export function useGenerateCourse() {
  return useMutation({
    mutationFn: async ({ topic, language }: { topic: string; language: 'he' | 'en' }) => {
      const { course } = await generateCourse(topic, language);
      const saved: Course = {
        id: `ai-${newId()}`,
        title: course.title,
        description: course.description,
        icon: 'sparkles-outline',
        builtIn: false,
        created_at: new Date().toISOString(),
        concepts: course.concepts,
      };
      useDBStore.getState().update((db) => saveCustomCourse(db, saved));
      return saved;
    },
  });
}

export function useDeleteCourse() {
  return useMutation({
    mutationFn: (id: string) => read(() => useDBStore.getState().update((db) => deleteCustomCourse(db, id))),
  });
}
