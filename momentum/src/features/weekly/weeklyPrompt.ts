import AsyncStorage from '@react-native-async-storage/async-storage';
import { localDateFromIso, type LocalDateString } from '@/core/localDate';
import type { Habit } from '@/domain/models';
import { previousWeek, weekStart } from '@/domain/weekly';

const KEY = 'momentum.weekly.v1';

/**
 * True once per week (first open after the week rolls over), and only when
 * there is a full previous week to summarise. Records that it was shown.
 */
export async function shouldShowWeeklySummary(today: LocalDateString, habits: readonly Habit[]): Promise<boolean> {
  const week = weekStart(today);
  const hadHabitsLastWeek = habits.some((h) => localDateFromIso(h.createdAt) <= previousWeek(today).start);
  if (!hadHabitsLastWeek) return false;
  try {
    if ((await AsyncStorage.getItem(KEY)) === week) return false;
    await AsyncStorage.setItem(KEY, week);
    return true;
  } catch {
    return false;
  }
}
