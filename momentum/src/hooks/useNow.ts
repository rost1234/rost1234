import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Re-renders every `intervalMs` while `active`, and immediately on resume from
 * background. The interval only drives repaints — timing maths always use the
 * wall clock, so a throttled or frozen interval never causes drift.
 */
export function useNow(active: boolean, intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(new Date());
    const immediate = setTimeout(tick, 0); // refresh right away when (re)activated
    const id = setInterval(tick, intervalMs);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
    return () => {
      clearTimeout(immediate);
      clearInterval(id);
      subscription.remove();
    };
  }, [active, intervalMs]);

  return now;
}
