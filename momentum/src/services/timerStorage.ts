import AsyncStorage from '@react-native-async-storage/async-storage';
import { isPersistedTimer, type PersistedTimer } from '@/domain/focusTimer';

const TIMER_KEY = 'momentum.focusTimer.v1';

/** Reads the active timer; corrupt or missing data yields null. */
export async function loadTimer(): Promise<PersistedTimer | null> {
  const raw = await AsyncStorage.getItem(TIMER_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isPersistedTimer(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveTimer(timer: PersistedTimer): Promise<void> {
  await AsyncStorage.setItem(TIMER_KEY, JSON.stringify(timer));
}

export async function clearTimer(): Promise<void> {
  await AsyncStorage.removeItem(TIMER_KEY);
}
