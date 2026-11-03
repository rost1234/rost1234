import { biology } from './courses/biology';
import { computing } from './courses/computing';
import { economics } from './courses/economics';
import { math } from './courses/math';
import { physics } from './courses/physics';
import { psychology } from './courses/psychology';
import type { Course } from './types';

/** Guided courses that ship with the app (Hebrew content, available offline). */
export const BUILT_IN_COURSES: readonly Course[] = [physics, biology, math, computing, economics, psychology];

export function builtInCourse(id: string): Course | undefined {
  return BUILT_IN_COURSES.find((c) => c.id === id);
}
