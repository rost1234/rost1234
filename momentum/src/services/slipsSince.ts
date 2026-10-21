import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'momentum.slipsSince.v1';
let cached: string | null = null;

/**
 * The moment slips started counting against a clean run. Before that, "Not this time" on the
 * urge screen didn't reset anything, so older answers don't suddenly break a run on update.
 */
export async function slipsCountSince(): Promise<string> {
  if (cached) return cached;
  try {
    const stored = await AsyncStorage.getItem(KEY);
    if (stored) return (cached = stored);
    cached = new Date().toISOString();
    await AsyncStorage.setItem(KEY, cached);
  } catch {
    cached = new Date().toISOString();
  }
  return cached;
}
