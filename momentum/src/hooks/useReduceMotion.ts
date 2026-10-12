import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** True when the system asks for less motion; decorative animations are skipped then. */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(
      (value) => {
        if (alive) setReduce(value);
      },
      () => undefined,
    );
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduce;
}
