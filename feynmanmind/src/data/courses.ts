import { useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { generateCourse, generateLesson } from '@/api/functions';
import { BUILT_IN_COURSES, builtInCourse } from '@/content/catalog';
import { searchAll } from '@/content/search';
import { findStation, stationsOf, type Course, type LevelKey } from '@/content/types';
import {
  courseProgress,
  deleteCustomCourse,
  lessonFor,
  saveCustomCourse,
  saveLesson,
  savePlacement,
  startStation,
  stationOf,
  type PlacementState,
} from '@/local/logic';
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

export interface ContinueLearning {
  course: Course;
  station: { key: string; title: string; unit?: string };
  levelKey: LevelKey;
  done: number;
  total: number;
}

/**
 * The course the learner was working on most recently (latest station started,
 * or latest placement test), with its next station. Null before any course is begun.
 */
export function useContinueLearning() {
  return useQuery({
    queryKey: ['courses', 'continue'],
    queryFn: () =>
      read((): ContinueLearning | null => {
        const db = getDB();
        let best: { at: string; value: ContinueLearning } | null = null;
        for (const course of allCourses()) {
          const progress = courseProgress(db, course);
          if (!progress.nextKey) continue;
          const subject = Object.values(db.subjects).find((s) => s.course_id === course.id);
          const started = subject ? Object.values(db.concepts).filter((c) => c.subject_id === subject.id).map((c) => c.created_at) : [];
          const at = [...started, progress.placement?.taken_at ?? ''].sort().at(-1) ?? '';
          if (!at) continue;
          const ref = findStation(course, progress.nextKey)!;
          const value = {
            course,
            station: { key: ref.station.key, title: ref.station.title, unit: ref.station.unit },
            levelKey: ref.level.key,
            done: progress.done,
            total: progress.total,
          };
          if (!best || at > best.at) best = { at, value };
        }
        return best?.value ?? null;
      }),
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
        levels: course.levels,
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

/** Writes the lesson for a station that doesn't have one yet (AI), and saves it on the device. */
export function useWriteStationLesson() {
  return useMutation({
    mutationFn: async ({ courseId, key, language }: { courseId: string; key: string; language: 'he' | 'en' }) => {
      const course = findCourse(courseId);
      const ref = course && findStation(course, key);
      if (!course || !ref) throw new NotFoundError('Station');
      const existing = lessonFor(getDB(), course, ref.station);
      if (existing) return existing;
      const { lesson } = await generateLesson({
        concept_title: ref.station.title,
        summary: ref.station.summary,
        unit: ref.station.unit,
        course_title: course.title,
        level: ref.level.key,
        // Everything before this station, so the lesson builds on it.
        previous_titles: stationsOf(course)
          .slice(0, ref.index)
          .map((s) => s.station.title),
        language,
      });
      useDBStore.getState().update((db) => saveLesson(db, courseId, key, lesson));
      return lesson;
    },
  });
}

export function useSavePlacement() {
  return useMutation({
    mutationFn: ({ courseId, state }: { courseId: string; state: PlacementState }) =>
      read(() => useDBStore.getState().update((db) => savePlacement(db, courseId, state, new Date()))),
  });
}

/** The station, its place in the course, and its lesson if one exists yet. */
export function useStation(courseId: string, key: string) {
  return useQuery({
    queryKey: ['courses', courseId, 'station', key],
    queryFn: () =>
      read(() => {
        const course = findCourse(courseId);
        const ref = course && findStation(course, key);
        if (!course || !ref) throw new NotFoundError('Station');
        const all = stationsOf(course);
        return {
          course,
          ref,
          total: all.length,
          next: all[ref.index + 1]?.station ?? null,
          lesson: lessonFor(getDB(), course, ref.station),
          progress: courseProgress(getDB(), course).stations[ref.index]!,
        };
      }),
  });
}

export function useSearch(query: string) {
  const db = useDBStore((s) => s.db);
  return useMemo(() => searchAll(db, allCourses(), query), [db, query]);
}
