import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { getLocalDeviceDate, msUntilNextDayStart, type LocalDateString } from '@/core/localDate';

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

    return () => {
      if (timeout) clearTimeout(timeout);
      subscription.remove();
    };
  }, []);

  return today;
}
