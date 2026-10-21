import AsyncStorage from '@react-native-async-storage/async-storage';
import { setDayStartHour } from '@/core/localDate';

const KEY = 'momentum.dayStart.v1';

/** Reads the chosen day-start hour (also from the widget and notification tasks, which start cold). */
export async function loadDayStart(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const hour = raw === null ? NaN : Number(raw);
    if (Number.isFinite(hour)) setDayStartHour(hour);
  } catch {
    // The default stays.
  }
}

export async function saveDayStart(hour: number): Promise<void> {
  setDayStartHour(hour);
  await AsyncStorage.setItem(KEY, String(hour));
}
