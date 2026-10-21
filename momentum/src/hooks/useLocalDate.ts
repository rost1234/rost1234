import { useEffect, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { getDayStartHour, getLocalDeviceDate, isDayStartKnown, msUntilNextDayStart, subscribeDayStart, type LocalDateString } from '@/core/localDate';

/**
 * The app's current day (it starts at the day-start hour, 03:00 by default), kept fresh across that hour while the app is open and
 * re-checked whenever the app returns to the foreground (timers are frozen in
 * the background, so the resume check is what catches overnight suspends).
 */
export function useLocalDate(): LocalDateString {
  const [today, setToday] = useState<LocalDateString>(() => getLocalDeviceDate());

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const refresh = () => setToday(getLocalDeviceDate());
    const scheduleMidnight = () => {
      if (timeout) clearTimeout(timeout);
      // +1s guard so we land safely on the new day.
      timeout = setTimeout(() => {
        refresh();
        scheduleMidnight();
      }, msUntilNextDayStart() + 1000);
    };

    scheduleMidnight();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refresh();
        scheduleMidnight();
      }
    });

    // A new day-start hour (from Settings, or read at launch) can move "today".
    const stopDayStart = subscribeDayStart(() => {
      refresh();
      scheduleMidnight();
    });

    return () => {
      if (timeout) clearTimeout(timeout);
      subscription.remove();
      stopDayStart();
    };
  }, []);

  return today;
}

/** The day-start hour, kept fresh when it changes. */
export function useDayStartHour(): number {
  return useSyncExternalStore(subscribeDayStart, getDayStartHour);
}

/** False until the chosen day-start hour was read at launch. */
export function useDayStartKnown(): boolean {
  return useSyncExternalStore(subscribeDayStart, isDayStartKnown);
}
